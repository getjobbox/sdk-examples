# JobBox Vue.js example

Official Vue 3 + Vite example for the JobBox partner SDKs — a JobFinder-style job board that lists catalog jobs through `@getjobbox/sdk` (Node) or `getjobbox` (Python).

The API key stays on the server. The browser only calls local `/api/*` routes.

## Setup

```bash
cd sdk/examples/vue
cp .env.example .env
# set JOBBOX_API_KEY from JobBox → Settings → Developer
npm install
```

`JOBBOX_BASE_URL` defaults to `https://api.getjobbox.com`.

## Run with Node SDK (default)

```bash
npm run dev
# alias: npm run dev:node
```

Uses `@getjobbox/sdk` in `server.mjs` (Express + Vite).  
Open [http://localhost:5174](http://localhost:5174) · health: `/api/health` → `"sdk":"node"`.

## Run with Python SDK

```bash
# once: install getjobbox (or rely on server.py repo path fallback)
python3 -m pip install -e ../../python

npm run dev:python
```

Starts:

1. `server.py` — `getjobbox` on `http://127.0.0.1:5175`
2. Vite — UI on [http://localhost:5174](http://localhost:5174), proxies `/api` → Python

Health: `/api/health` → `"sdk":"python"`.

Optional env: `PYTHON` / `PYTHON_BIN`, `PYTHON_API_PORT` (default `5175`).

## What it shows

| Route | Page | SDK call |
|-------|------|----------|
| `/` | All Jobs | `jobs.list` + category chips |
| `/hr` | HR Jobs | `jobs.list({ category: 'hr' })` |
| `GET /api/categories` | — | `jobs.categories()` |
| `GET /api/jobs` | — | `jobs.list(...)` |
| `GET /api/jobs/:id` | — | `jobs.get(id)` |

Includes search, category filters, pagination, cached list/detail state, and a job detail modal with **Apply on JobBox** → `app.getjobbox.com/j/:id`.

## Tests

```bash
npm test
```

Covers date/salary formatting helpers and the jobs cache store (`ensureList` / `ensureDetail` / categories).
