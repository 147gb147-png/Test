# Hosting FieldLab online

FieldLab is one Node process with a `data/` folder — anything that can run
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

> Volumes need Railway's Hobby plan — on the free trial the app runs, but
> data is wiped on every redeploy, so attach the volume before real use.

1. Push this repo to GitHub (already done if you're reading this there).
2. At [railway.app](https://railway.app): **New Project → Deploy from GitHub
   repo** → pick this repo. The included `railway.json` pins the build to
   the `Dockerfile` and wires the `/api/health` check, so no build settings
   are needed. (If you deployed an older commit, make sure Railway is
   building the latest — older Dockerfiles crash-loop, see Troubleshooting.)
3. **Attach a volume**: right-click the service → **Attach Volume** → mount
   path **`/app/data`**. Railway redeploys automatically.
4. **Settings → Networking → Generate Domain**. If it asks which port,
   choose **8080** (or accept the suggested one).
5. Open the URL and create your admin account.

New pushes to the connected branch redeploy automatically; the volume (your
data) is untouched by deploys.

## Option B — Fly.io (fast, generous free allowance)

```bash
# one-time: install flyctl and sign in  →  https://fly.io/docs/flyctl/install/
fly launch --copy-config --no-deploy   # uses the fly.toml in this repo;
                                       # pick a unique app name + region
fly volumes create fieldlab_data --size 1
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
git clone <your-repo-url> fieldlab && cd fieldlab
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
sudo npm i -g pm2 && pm2 start server.js --name fieldlab && pm2 save
```

---

## Troubleshooting

| Symptom (deploy logs) | Cause & fix |
|---|---|
| `EACCES: permission denied, mkdir '/app/data'` (crash loop), or `FATAL: the data directory is not writable` | You're running an image built from code older than v2.2 whose Dockerfile ran as a non-root user that can't write the root-owned volume. **Pull/redeploy the latest commit** — the current Dockerfile runs as root and pre-creates `/app/data`. |
| `Nixpacks/Railpack was unable to generate a build plan` | The builder ignored the Dockerfile. Latest code includes `railway.json` (pins `DOCKERFILE`) and a `package.json` with a `start` script, so either build path works. Redeploy the latest commit. |
| “Application failed to respond” on the generated domain | The domain targets the wrong port — regenerate the domain and pick **8080**. Also confirm the deploy is green and `/api/health` returns `{"ok":true}` (open `https://your-domain/api/health`). |
| Deploy is green but the login/setup page errors when saving | Almost always a data-dir write failure — check logs for `EACCES` (see first row), and that the volume is mounted at exactly `/app/data`. |
| Data vanished after a redeploy | No volume was attached (Railway trial) or it's mounted at the wrong path. Attach a volume at `/app/data`; restore from Settings → Data → your JSON backup. |
| Wrong branch deployed | Railway builds the repo's default branch by default — set the service's branch to the one with the app code (Service → Settings → Source). |

Still stuck? Grab the **Deploy Logs** text from Railway and compare against
the first column — the fatal line is always near the top of the crash.

## Backups

- **In-app**: Settings → Data & general → *Export JSON backup* (workspace
  only; user accounts are in `data/users.json`).
- **Whole state**: copy the `data/` directory (or the Docker volume — see the
  comment in `docker-compose.yml`). Restore = put the files back and restart.

## Upgrading

Pull the new code and restart (`docker compose up -d --build`, `fly deploy`,
or platform redeploy). The client migrates older data formats automatically;
`data/` is never touched by deploys.
