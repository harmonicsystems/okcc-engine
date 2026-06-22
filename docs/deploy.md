# Deploying the game (GitHub Pages)

The engine in [`game-engine/`](../game-engine/) builds to plain static files — no backend,
no server. Deploy is automated by [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

## One-time setup

1. Create the repo under the **harmonicsystems** org and push this folder to `main`.
   ```
   git remote add origin git@github-harmonicsystems:harmonicsystems/okcc-engine.git
   git push -u origin main
   ```
   (Per the global SSH config, harmonicsystems repos use the `github-harmonicsystems` host alias.)
2. On GitHub: **Settings → Pages → Build and deployment → Source = GitHub Actions.**
3. Push (or run the workflow manually from the Actions tab). The site goes live at
   `https://harmonicsystems.github.io/<repo>/`.

That's it. Every push to `main` rebuilds and redeploys.

## Why it "just works" at a subpath

Vite is configured with `base: './'`, so every asset URL is **relative**. The same build runs
at the Pages project subpath (`/okcc-engine/`), at a custom domain root, on Cloudflare Pages, or
from a plain file host — with no rebuild. Level maps and (future) art load with relative paths
for the same reason.

## What gets published

The workflow builds `game-engine/` and publishes `game-engine/dist` as the site root, so the URL
opens straight into the game (Menu → pick a robot → play).

The marketing one-pager (`website/index.html`) and the single-file demo (`demo/skeleton-game.html`)
are **not** part of this deploy. If you later want them served alongside the game (e.g. the site at
`/`, the game at `/play/`), copy them into `game-engine/public/` (Vite passes `public/` through
verbatim) and link them — or give them their own Pages deploy.

## Building locally

```
cd game-engine
npm install
npm run build      # -> game-engine/dist (open via `npm run preview`)
```
