# Hosting AquaTrack online

AquaTrack is one Node process with a `data/` folder — anything that can run
Node (or Docker) and keep a persistent disk can host it. Every option below
gives your whole team one URL, one shared workspace, and permanent storage.

**The one rule: `data/` must live on persistent storage.** It holds the shared
workspace (`store.json`), user accounts (`users.json`) and sessions. On
platforms with ephemeral filesystems (free tiers without a disk/volume), data
would vanish on every redeploy — always attach a volume/disk as shown below.
Whatever host you pick, also export a JSON backup now and then from
**Settings → Data & general** (and back up the `data/` folder itself).

After deploying, open your URL — the first visit creates the **admin
account**; then add reps under **Admin**. Login is rate-limited against
brute force, and all traffic should run over HTTPS (every option below
provides it automatically except the bare-VPS route, where Caddy adds it).

---

## Option A — Railway (easiest, ~$5/mo)

1. Push this repo to GitHub (already done if you're reading this there).
2. At [railway.app](https://railway.app): **New Project → Deploy from GitHub
   repo** → pick this repo. Railway detects the `Dockerfile` and builds it.
3. In the service: **Settings → Networking → Generate Domain** — that's your
   public HTTPS URL.
4. **Add a volume** (right-click the service → *Attach Volume*), mount path:
   `/app/data`.
5. Redeploy. Done — visit the URL and create your admin account.

## Option B — Fly.io (fast, generous free allowance)

```bash
# one-time: install flyctl and sign in  →  https://fly.io/docs/flyctl/install/
fly launch --copy-config --no-deploy   # uses the fly.toml in this repo;
                                       # pick a unique app name + region
fly volumes create aquatrack_data --size 1
fly deploy
fly open
```

`fly.toml` already mounts the volume at `/app/data` and wires the
`/api/health` check. Cost is ~$0–2/mo at this size.

## Option C — Render.com

The repo includes `render.yaml`: **New → Blueprint** and point it at this
repo. Render needs the **Starter** plan (~$7/mo) for the persistent disk —
its free tier has an ephemeral disk and would lose your data on redeploy.

## Option D — any VPS with Docker (most control, ~$4–6/mo)

Works on DigitalOcean, Hetzner, Linode, Lightsail, a spare office machine…

```bash
git clone <your-repo-url> aquatrack && cd aquatrack
docker compose up -d          # app on port 8080, data in a named volume
```

Then put HTTPS in front with Caddy (automatic Let's Encrypt certificates).
Point a DNS record (e.g. `aqua.yourcompany.com`) at the server, then:

```bash
sudo apt install caddy        # or: docker run caddy
```

`/etc/caddy/Caddyfile`:

```
aqua.yourcompany.com {
    reverse_proxy localhost:8080
}
```

`sudo systemctl reload caddy` — that's it: valid HTTPS, auto-renewed.

No Docker? Plain Node works the same:

```bash
node server.js                          # or keep it alive with systemd/pm2:
sudo npm i -g pm2 && pm2 start server.js --name aquatrack && pm2 save
```

---

## Backups

- **In-app**: Settings → Data & general → *Export JSON backup* (workspace
  only; user accounts are in `data/users.json`).
- **Whole state**: copy the `data/` directory (or the Docker volume — see the
  comment in `docker-compose.yml`). Restore = put the files back and restart.

## Upgrading

Pull the new code and restart (`docker compose up -d --build`, `fly deploy`,
or platform redeploy). The client migrates older data formats automatically;
`data/` is never touched by deploys.
