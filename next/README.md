# JobBox Next.js example

Job board demo that mirrors [`../react`](../react) / [`../vue`](../vue) and calls JobBox through the **Node SDK** (`@getjobbox/sdk`) inside Next.js App Router Route Handlers.

**Do not put `JOBBOX_API_KEY` in client components.** The browser only calls local `/api/*`.

## Setup

```bash
cd sdk/examples/next
cp .env.example .env.local
```

Copy these from [`../vue/.env`](../vue/.env) (or create a key in JobBox → Settings → Developer):

| Vue `.env` | Next.js `.env.local` |
|------------|----------------------|
| `JOBBOX_API_KEY` | `JOBBOX_API_KEY` |
| `JOBBOX_BASE_URL` | `JOBBOX_BASE_URL` |
| `VITE_JOBBOX_APP_URL` | `NEXT_PUBLIC_JOBBOX_APP_URL` |

Then:

```bash
npm install
npm run dev
```

Open **http://localhost:3001**

Health check: http://localhost:3001/api/health → `{ "ok": true, "sdk": "node", "example": "next" }`

## Routes

| Path | Purpose |
|------|---------|
| `/` | All jobs (category chips) |
| `/hr` | HR category locked |
| `/api/health` | SDK health |
| `/api/categories` | `jobbox.jobs.categories()` |
| `/api/jobs` | `jobbox.jobs.list(...)` |
| `/api/jobs/[id]` | `jobbox.jobs.get(id)` |

## Stack

- [Next.js](https://nextjs.org/) App Router
- [`@getjobbox/sdk`](../../node) via `file:../../node`
- JobFinder UI ported from the React example (client components + local `/api` cache)
