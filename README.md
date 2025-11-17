# Tech Poster Generator (Node + Express)

Simple Node.js service that pulls the latest tech headlines, extracts key talking points, and generates branded poster PNGs you can share right away. No React build or heavy tooling—just Express, EJS, and a few helper libraries.

## Prerequisites

- Node.js 18+ (Node 22 LTS recommended)
- Optional: fonts in `assets/fonts/` (`Poppins-SemiBold.ttf`, `Inter-Regular.ttf`) for nicer typography

## Quick Start

```bash
npm install
npm run dev   # or: npm start
```

Then open <http://localhost:8080>. Hit **Generate Posters Now** to run the pipeline once. Posters are written to `out/` and served at `/generated/<filename>.png`.
cd
## Configuration

Create a `.env` (copy from `.env.example`) to override defaults:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port | `8080` |
| `BRAND_NAME` | Branding text in the poster header | `Tech Daily` |
| `LOGO_PATH` | Optional logo overlay path | `assets/logo.png` |
| `FOOTER_TEXT` | Footer line above hashtags | `Fresh tech highlights for you` |
| `HASHTAGS` | Hashtag line beneath the footer | `#AI #Cloud #Security #Dev #TechNews` |
| `POSTER_FORMAT` | `square` (1080x1080) or `landscape` (1200x627) | `square` |
| `POSTER_TEMPLATE` | Poster style preset (`midnight`, `aurora`, `slate`, `sunrise`, `matrix`, `paper`) | `midnight` |
| `MAX_POSTS` | Posters per run (1-5) | `2` |
| `LOOKBACK_HOURS` | Ignore news older than this window | `24` |
| `OUTPUT_DIR` | Where images are written | `out` |
| `DATA_DIR` | Location for the dedupe cache (`seen.db`) | `data` |
| `ENABLE_SCHEDULER` | Set to `false` to disable cron runs | `true` |
| `SCHEDULE_CRON` | Cron expression with seconds | `0 30 8 * * *` |
| `TIMEZONE` | App timezone for scheduling | `Asia/Kolkata` |
| `RSS_FEEDS` | Comma-separated list of RSS URLs | Verge, Ars Technica, Wired |
| `LINKEDIN_CLIENT_ID` | LinkedIn app Client ID for OAuth | _none_ |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn app Client Secret for OAuth | _none_ |
| `LINKEDIN_REDIRECT_URI` | OAuth callback (must match your LinkedIn app) | `http://localhost:8787/callback` |

The dedupe store uses SQLite (`better-sqlite3`). Delete `data/seen.db` if you want to reprocess everything.

### LinkedIn login & uploads

1. In your LinkedIn developer app, add `http://localhost:8787/callback` (or your deployed domain's `/auth/linkedin/callback`) as an authorized redirect URL. Enable the scopes **r_liteprofile**, **r_emailaddress**, and **w_member_social**.
2. Set `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, and `LINKEDIN_REDIRECT_URI` in `.env`.
3. Restart the server, click **Connect LinkedIn** in the UI, and finish the sign-in. The session stores the access token in memory only (restart to clear).
4. Each generated poster now shows an **Upload to LinkedIn** button. Click it to post the image to your personal feed using the authenticated account.

### Template presets

You can pick a template directly from the homepage before you click **Generate Posters Now**, or set a default via `POSTER_TEMPLATE` in `.env`. The bundled presets are:

- `midnight`: deep navy with neon bloom and rounded bullets.
- `aurora`: purple/teal gradient with wave overlays and glowing grid.
- `slate`: news-room inspired, serif headlines on a bright canvas.
- `sunrise`: warm coral gradient with translucent glow accents.
- `matrix`: synthwave-inspired black glass with neon grid + monospace fonts.
- `paper`: retro newsprint texture with high-contrast serif typography.

Schedulers and Docker deployments follow whatever `POSTER_TEMPLATE` is set to. Manual runs always use the template you chose in the UI for that request.

### Template gallery & previews

- Scroll to **Template Gallery** on <http://localhost:8080> to see live previews, font stacks, and palette swatches for every template before you run a batch.
- The gallery images are generated on demand through `/demo/<templateId>` (e.g. `/demo/matrix`). Feel free to embed those routes elsewhere if you want dynamic previews in docs or admin panels.
- To tweak typography, drop additional `.ttf` files into `assets/fonts/` and add them to `src/poster.js` (font registration) or directly override the `fonts` object in `src/templates.js` for each preset.

### Manual overrides & automation

- Use the checkboxes in the run form to render the same feed across multiple templates in one go, and adjust the **Posts per run** field without modifying `.env`.
- Automation hooks:
  - `GET /api/posters` &mdash; returns the latest run metadata plus ready-to-serve image URLs.
  - `POST /api/run` &mdash; trigger a job with a JSON body such as:
    ```json
    {
      "templates": ["midnight", "matrix"],
      "maxPosts": 3
    }
    ```
    The endpoint blocks until rendering finishes and replies with the applied templates/count. It responds with HTTP `409` if another run is already in progress.
- The `/demo/<templateId>` previews (used by the gallery) are regular PNG responses you can embed in wikis, Slack, or dashboards.
- Set `SLACK_WEBHOOK_URL` (and/or `WEBHOOK_URL`) to receive JSON summaries for every batch automatically.

### Run history & bundles

- Download the freshest poster set (all PNGs + a `summary.json`) via <http://localhost:8080/bundle/latest.zip>.
- The dashboard now highlights recent runs (template mix, poster counts, average quality) so reviewers can audit progress at a glance.


## How It Works

1. **Fetch headlines** via `rss-parser`.
2. **Extract article text** with Mozilla Readability (`jsdom`).
3. **Build bullet points** from the first few sentences.
4. **Render posters** with `canvas` (Node bindings to Cairo).
5. **Serve UI** using Express + EJS with a single `/run` POST action.
6. **Schedule runs** through `node-cron` (optional, enabled by default).

## Troubleshooting

- If poster text looks cramped, add real fonts to `assets/fonts/` and restart.
- Node-canvas bundles prebuilt binaries on Windows; if install fails, ensure Python 3 and the MSVC build tools are available, then reinstall `canvas`.
- Some feeds strip descriptions or block crawling; those entries fall back to shorter bullets.

## Scripts

- `npm run dev` &mdash; Watch mode using the built-in `node --watch`.
- `npm start` &mdash; Run once in production mode.

Feel free to integrate the HTML or API endpoints into your own automation flows. Pull requests welcome!

## Deployment

### Docker (recommended)

1. Build the production image (this installs the native deps for `canvas`/`better-sqlite3`):
   ```bash
   docker build -t tech-poster .
   ```
2. Run it, wiring the `.env` plus persistent volumes for posters + the dedupe DB:
   ```bash
   docker run --env-file .env \
     -p 8080:8080 \
     -v $(pwd)/out:/app/out \
     -v $(pwd)/data:/app/data \
     tech-poster
   ```
3. Visit <http://localhost:8080>. Override `PORT` if your host injects a different port (Render/Railway/etc).

> Keep `ENABLE_SCHEDULER=true` on only one replica. If your platform auto-scales horizontally, set it to `false` and trigger runs via webhooks or cron from outside the container to avoid duplicate work.

### Render / Railway / Fly.io (Docker-based PaaS)

1. Push this repo to GitHub with the new `Dockerfile`.
2. Create a “Web Service” pointing at the repo and choose Docker deployment (most platforms auto-detect the file).
3. Add the env vars from `.env`. At minimum set `PORT`, `BRAND_NAME`, `RSS_FEEDS`, and `ENABLE_SCHEDULER`.
4. Mount a persistent disk (≥100 MB) to `/app/out` (poster PNGs) and `/app/data` (SQLite dedupe cache). Without it, outputs reset every deploy.
5. Make sure the health check pings `/` and that the service listens on the platform’s `$PORT`.

### Bare VM / PM2

```bash
ssh user@server
git clone <repo> && cd AI-automation
npm ci --omit=dev
NODE_ENV=production PORT=8080 ENABLE_SCHEDULER=false npm start
```

Wrap it with `pm2 start src/server.js --name tech-poster` or a systemd unit so it restarts automatically, and only set `ENABLE_SCHEDULER=true` on one instance.
