#!/usr/bin/env node
/*
 * AquaTrack server — zero-dependency Node.js (>=16) backend.
 *
 *   node server.js            → http://localhost:8080
 *   PORT=3000 node server.js  → custom port
 *
 * Provides:
 *  - static file serving for the app
 *  - a shared JSON data store (data/store.json) with optimistic versioning
 *    and record-level merge, so multiple reps can work at the same time
 *  - user accounts (data/users.json): admin / rep roles, scrypt-hashed
 *    passwords, token sessions (data/sessions.json)
 *  - server-side write scoping: reps can only modify sites assigned to them
 *
 * No npm install required — everything is Node built-ins.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8080);
const ROOT = __dirname;
const DATA_DIR = process.env.AQUATRACK_DATA || path.join(ROOT, 'data');
const MAX_BODY = 25 * 1024 * 1024;
const SESSION_DAYS = 30;
const HISTORY_KEEP = 25; // past doc versions kept in memory for 3-way write checks

/* ------------------------------------------------------------ file store */
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')); }
  catch (e) { return fallback; }
}
function writeJSON(file, obj) {
  const full = path.join(DATA_DIR, file);
  const tmp = full + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, full);
}

let store = readJSON('store.json', { version: 0, doc: null });
let users = readJSON('users.json', []);
let sessions = readJSON('sessions.json', {});

/* prune expired sessions on boot */
(function () {
  const cutoff = Date.now() - SESSION_DAYS * 86400000;
  let changed = false;
  for (const t of Object.keys(sessions)) {
    if (!sessions[t] || sessions[t].ts < cutoff) { delete sessions[t]; changed = true; }
  }
  if (changed) writeJSON('sessions.json', sessions);
})();

const docHistory = new Map(); // version -> canonical doc snapshot
if (store.doc) docHistory.set(store.version, store.doc);

/* --------------------------------------------------------------- helpers */
function canon(x) { // canonical JSON (sorted keys) for reliable deep-equality
  if (x === null || typeof x !== 'object') return JSON.stringify(x);
  if (Array.isArray(x)) return '[' + x.map(canon).join(',') + ']';
  return '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + canon(x[k])).join(',') + '}';
}

function hashPassword(pw, salt) {
  return crypto.scryptSync(String(pw), salt, 64).toString('hex');
}

function sanitizeUser(u) {
  return { id: u.id, name: u.name, username: u.username, role: u.role, active: u.active !== false };
}

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch (e) { reject(new Error('invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function authUser(req) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(\S+)$/);
  if (!m) return null;
  const sess = sessions[m[1]];
  if (!sess) return null;
  if (sess.ts < Date.now() - SESSION_DAYS * 86400000) { delete sessions[m[1]]; return null; }
  const u = users.find(x => x.id === sess.userId);
  return u && u.active !== false ? u : null;
}

/* ------------------------------------------------------- merge & guards */
const ENTITY_ARRAYS = ['sites', 'systems', 'samplePoints', 'visits', 'products', 'testDefs'];

/* Record-level last-write-wins merge of two doc versions.
 * Every record carries _ts (touched-at); deletions are tombstoned by id. */
function mergeDocs(cur, inc) {
  const out = {};
  const tombs = Object.assign({}, cur.tombstones || {});
  for (const [id, ts] of Object.entries(inc.tombstones || {})) {
    tombs[id] = Math.max(ts || 0, tombs[id] || 0);
  }
  for (const k of ENTITY_ARRAYS) {
    const map = new Map();
    for (const r of cur[k] || []) if (r && r.id) map.set(r.id, r);
    for (const r of inc[k] || []) {
      if (!r || !r.id) continue;
      const ex = map.get(r.id);
      if (!ex || (r._ts || 0) >= (ex._ts || 0)) map.set(r.id, r);
    }
    out[k] = [...map.values()].filter(r => !((tombs[r.id] || 0) > (r._ts || 0)));
  }
  const tpls = {};
  const keys = new Set([...Object.keys(cur.templates || {}), ...Object.keys(inc.templates || {})]);
  for (const k of keys) {
    const a = (cur.templates || {})[k], b = (inc.templates || {})[k];
    const pick = !a ? b : (!b ? a : (((b._ts || 0) >= (a._ts || 0)) ? b : a));
    if (pick && !((tombs['tpl:' + k] || 0) > (pick._ts || 0))) tpls[k] = pick;
  }
  out.templates = tpls;
  const sa = cur.settings || {}, sb = inc.settings || {};
  out.settings = ((sb._ts || 0) >= (sa._ts || 0)) ? sb : sa;
  out.tombstones = tombs;
  out.version = Math.max(cur.version || 2, inc.version || 2);
  return out;
}

/* Map every entity id to the rep that owns its site (null = unassigned). */
function ownerMap(doc) {
  const siteOwner = {}, sysSite = {}, own = {};
  for (const s of doc.sites || []) { siteOwner[s.id] = s.repId || null; own[s.id] = s.repId || null; }
  for (const y of doc.systems || []) { sysSite[y.id] = y.siteId; own[y.id] = siteOwner[y.siteId] !== undefined ? siteOwner[y.siteId] : null; }
  for (const p of doc.samplePoints || []) { own[p.id] = own[sysSite[p.systemId]] !== undefined ? own[sysSite[p.systemId]] : null; }
  for (const v of doc.visits || []) { own[v.id] = siteOwner[v.siteId] !== undefined ? siteOwner[v.siteId] : null; }
  return own;
}

/* Reps may only change entities under sites assigned to them (vs. their base
 * version). Shared catalog (tests, templates, products, settings) is open. */
function guardRepWrite(base, inc, uid) {
  const own = ownerMap(base);
  const SCOPED = ['sites', 'systems', 'samplePoints', 'visits'];
  const incById = {};
  for (const k of SCOPED) for (const r of inc[k] || []) incById[r.id] = r;

  for (const k of SCOPED) {
    for (const r of base[k] || []) {
      if (own[r.id] === uid) continue;
      const mine = incById[r.id];
      if (!mine || canon(mine) !== canon(r)) {
        return 'This change touches a site that is not assigned to you.';
      }
    }
  }
  const baseIds = new Set();
  for (const k of SCOPED) for (const r of base[k] || []) baseIds.add(r.id);
  const incSiteOwner = {}, incSysSite = {};
  for (const s of inc.sites || []) incSiteOwner[s.id] = s.repId || null;
  for (const y of inc.systems || []) incSysSite[y.id] = y.siteId;

  for (const s of inc.sites || []) if (!baseIds.has(s.id) && s.repId !== uid) return 'New sites must be assigned to you.';
  for (const y of inc.systems || []) if (!baseIds.has(y.id) && incSiteOwner[y.siteId] !== uid) return 'You can only add systems to your own sites.';
  for (const p of inc.samplePoints || []) if (!baseIds.has(p.id) && incSiteOwner[incSysSite[p.systemId]] !== uid) return 'You can only add sample points to your own sites.';
  for (const v of inc.visits || []) if (!baseIds.has(v.id) && incSiteOwner[v.siteId] !== uid) return 'You can only record visits at your own sites.';

  for (const id of Object.keys(inc.tombstones || {})) {
    if (!(base.tombstones || {})[id] && own[id] !== undefined && own[id] !== uid) {
      return 'You can only delete records under your own sites.';
    }
  }
  return null;
}

function validDocShape(doc) {
  if (!doc || typeof doc !== 'object') return false;
  for (const k of ENTITY_ARRAYS) if (!Array.isArray(doc[k])) return false;
  return typeof doc.templates === 'object' && typeof doc.settings === 'object';
}

/* ------------------------------------------------------------ API routes */
async function handleAPI(req, res, url) {
  const method = req.method;
  const p = url.pathname;

  /* ---- unauthenticated ---- */
  if (p === '/api/login-list' && method === 'GET') {
    return sendJSON(res, 200, {
      setup: users.length === 0,
      users: users.filter(u => u.active !== false).map(u => ({ username: u.username, name: u.name }))
    });
  }

  if (p === '/api/setup' && method === 'POST') {
    if (users.length > 0) return sendJSON(res, 403, { error: 'Setup is already complete.' });
    const b = await readBody(req);
    if (!b.name || !b.username || !b.password || String(b.password).length < 4) {
      return sendJSON(res, 400, { error: 'Name, username and a password (min 4 chars) are required.' });
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const u = {
      id: 'u-' + crypto.randomBytes(6).toString('hex'),
      name: String(b.name).trim(), username: String(b.username).trim().toLowerCase(),
      role: 'admin', active: true, salt, hash: hashPassword(b.password, salt)
    };
    users.push(u); writeJSON('users.json', users);
    const token = crypto.randomBytes(24).toString('hex');
    sessions[token] = { userId: u.id, ts: Date.now() };
    writeJSON('sessions.json', sessions);
    return sendJSON(res, 200, { token, user: sanitizeUser(u) });
  }

  if (p === '/api/login' && method === 'POST') {
    const b = await readBody(req);
    const u = users.find(x => x.username === String(b.username || '').trim().toLowerCase());
    if (!u || u.active === false || hashPassword(b.password || '', u.salt) !== u.hash) {
      return sendJSON(res, 401, { error: 'Wrong username or password.' });
    }
    const token = crypto.randomBytes(24).toString('hex');
    sessions[token] = { userId: u.id, ts: Date.now() };
    writeJSON('sessions.json', sessions);
    return sendJSON(res, 200, { token, user: sanitizeUser(u) });
  }

  /* ---- authenticated ---- */
  const user = authUser(req);
  if (!user) return sendJSON(res, 401, { error: 'Not signed in.' });

  if (p === '/api/logout' && method === 'POST') {
    const m = (req.headers.authorization || '').match(/^Bearer\s+(\S+)$/);
    if (m) { delete sessions[m[1]]; writeJSON('sessions.json', sessions); }
    return sendJSON(res, 200, { ok: true });
  }

  if (p === '/api/me' && method === 'GET') {
    return sendJSON(res, 200, { user: sanitizeUser(user) });
  }

  if (p === '/api/users' && method === 'GET') {
    return sendJSON(res, 200, { users: users.map(sanitizeUser) });
  }

  if (p === '/api/users' && method === 'POST') {
    if (user.role !== 'admin') return sendJSON(res, 403, { error: 'Admins only.' });
    const b = await readBody(req);
    if (!b.name || !b.username || !b.password || String(b.password).length < 4) {
      return sendJSON(res, 400, { error: 'Name, username and a password (min 4 chars) are required.' });
    }
    const uname = String(b.username).trim().toLowerCase();
    if (users.some(x => x.username === uname)) return sendJSON(res, 400, { error: 'That username is taken.' });
    const salt = crypto.randomBytes(16).toString('hex');
    const u = {
      id: 'u-' + crypto.randomBytes(6).toString('hex'),
      name: String(b.name).trim(), username: uname,
      role: b.role === 'admin' ? 'admin' : 'rep', active: true,
      salt, hash: hashPassword(b.password, salt)
    };
    users.push(u); writeJSON('users.json', users);
    return sendJSON(res, 200, { user: sanitizeUser(u) });
  }

  const userMatch = p.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch && method === 'PUT') {
    const target = users.find(x => x.id === userMatch[1]);
    if (!target) return sendJSON(res, 404, { error: 'No such user.' });
    const selfPwOnly = user.id === target.id;
    if (user.role !== 'admin' && !selfPwOnly) return sendJSON(res, 403, { error: 'Admins only.' });
    const b = await readBody(req);

    if (user.role === 'admin') {
      const wouldDeactivate = b.active === false || (b.role && b.role !== 'admin' && target.role === 'admin');
      if (wouldDeactivate && target.role === 'admin') {
        const remaining = users.filter(x => x.role === 'admin' && x.active !== false && x.id !== target.id);
        if (!remaining.length) return sendJSON(res, 400, { error: 'Cannot remove the last active admin.' });
      }
      if (b.name) target.name = String(b.name).trim();
      if (b.username) {
        const uname = String(b.username).trim().toLowerCase();
        if (users.some(x => x.username === uname && x.id !== target.id)) return sendJSON(res, 400, { error: 'That username is taken.' });
        target.username = uname;
      }
      if (b.role) target.role = b.role === 'admin' ? 'admin' : 'rep';
      if (typeof b.active === 'boolean') target.active = b.active;
    }
    if (b.password) {
      if (String(b.password).length < 4) return sendJSON(res, 400, { error: 'Password must be at least 4 characters.' });
      target.salt = crypto.randomBytes(16).toString('hex');
      target.hash = hashPassword(b.password, target.salt);
    }
    writeJSON('users.json', users);
    return sendJSON(res, 200, { user: sanitizeUser(target) });
  }

  if (p === '/api/state' && method === 'GET') {
    const since = Number(url.searchParams.get('since'));
    if (!isNaN(since) && since === store.version) {
      return sendJSON(res, 200, { unchanged: true, version: store.version });
    }
    return sendJSON(res, 200, { version: store.version, doc: store.doc });
  }

  if (p === '/api/state' && method === 'PUT') {
    const b = await readBody(req);
    if (!validDocShape(b.doc)) return sendJSON(res, 400, { error: 'Malformed document.' });
    const baseVersion = Number(b.baseVersion) || 0;

    if (user.role !== 'admin' && store.doc) {
      const baseDoc = docHistory.get(baseVersion) || (baseVersion === store.version ? store.doc : null);
      if (!baseDoc) {
        return sendJSON(res, 409, { error: 'Your copy is too far behind — reload and try again.', version: store.version, doc: store.doc });
      }
      const violation = guardRepWrite(baseDoc, b.doc, user.id);
      if (violation) return sendJSON(res, 403, { error: violation, version: store.version, doc: store.doc });
    }

    let merged = false;
    let next = b.doc;
    if (store.doc && baseVersion !== store.version) {
      next = mergeDocs(store.doc, b.doc);
      merged = true;
    }
    store = { version: store.version + 1, doc: next };
    writeJSON('store.json', store);
    docHistory.set(store.version, next);
    while (docHistory.size > HISTORY_KEEP) {
      docHistory.delete(docHistory.keys().next().value);
    }
    return sendJSON(res, 200, { version: store.version, merged, doc: merged ? next : null });
  }

  return sendJSON(res, 404, { error: 'Unknown API endpoint.' });
}

/* ---------------------------------------------------------- static files */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8', '.map': 'application/json'
};

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const full = path.normalize(path.join(ROOT, rel));
  if (!full.startsWith(ROOT) || full.startsWith(DATA_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(full, (err, buf) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) await handleAPI(req, res, url);
    else if (req.method === 'GET') serveStatic(req, res, url);
    else { res.writeHead(405); res.end(); }
  } catch (e) {
    sendJSON(res, e.message === 'payload too large' ? 413 : 400, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log('AquaTrack server running at http://localhost:' + PORT);
  console.log('Data directory: ' + DATA_DIR);
  if (!users.length) console.log('No users yet — open the app in a browser to create the first admin account.');
});
