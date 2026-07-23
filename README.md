# JobBox SDK examples

Sample apps that show how to use the JobBox partner SDKs (Node, Python, PHP, and more) behind a small local API.

**Full SDK docs:** [getjobbox.github.io/sdk](https://getjobbox.github.io/sdk/) · [Server-side pattern](https://getjobbox.github.io/sdk/guides/server-side-pattern/)

## Important: server-side only

**Do not call the JobBox SDK or put `JOBBOX_API_KEY` in frontend code.**

API keys must stay on the server. These examples intentionally use that pattern:

1. The browser talks only to local `/api/*` routes (no JobBox key in the client).
2. A small Node, Python, PHP (CodeIgniter/Laravel), or Next.js Route Handler holds `JOBBOX_API_KEY` and calls the SDK.
3. The UI never imports `@getjobbox/sdk` / `getjobbox` / `getjobbox/sdk` in the browser or reads the secret.

If you embed the key in a SPA, mobile app, or any public bundle, anyone can extract it and use your quota.

```
Browser  →  your server (/api/*)  →  JobBox API (X-JobBox-Api-Key)
              ↑
         JOBBOX_API_KEY lives here only
```

## Examples

| Example | Stack | Notes |
|---------|--------|--------|
| [`vue/`](./vue) | Vue 3 + Vite | Job board; Node or Python proxy |
| [`react/`](./react) | React + Vite | Same board as Vue |
| [`angular/`](./angular) | Angular | Same pattern |
| [`next/`](./next) | Next.js App Router | Same board; Node SDK in Route Handlers |
| [`codeigniter/`](./codeigniter) | CodeIgniter 4 | Same board; PHP SDK (`getjobbox/sdk`) |
| [`laravel/`](./laravel) | Laravel | Same board; PHP SDK (`getjobbox/sdk`) |

Each folder has its own README, `.env.example`, and setup steps. Copy `.env.example` → `.env` and set your key from JobBox → Settings → Developer. Never commit `.env`.

## Quick start

```bash
# SPA examples
cd vue   # or react / angular / next
cp .env.example .env   # next: .env.local
# set JOBBOX_API_KEY
npm install
npm run dev

# PHP / CodeIgniter or Laravel
cd codeigniter   # or laravel
cp .env.example .env
# set JOBBOX_API_KEY (same value as vue/.env)
composer install
# CodeIgniter:
composer serve
# Laravel:
php artisan serve --port=8081
```

See each example README for ports and proxy options.
