# JobBox CodeIgniter example

Job board demo that mirrors [`../vue`](../vue) and calls JobBox through the **PHP SDK** (`getjobbox/sdk`) inside CodeIgniter 4.

**Do not put `JOBBOX_API_KEY` in the browser.** Controllers hold the key and expose the same local `/api/*` contract as the Vue example.

## Setup

```bash
cd sdk/examples/codeigniter
cp .env.example .env
```

Copy these from [`../vue/.env`](../vue/.env) (or create a key in JobBox → Settings → Developer):

| Vue `.env` | CodeIgniter `.env` |
|------------|--------------------|
| `JOBBOX_API_KEY` | `JOBBOX_API_KEY` |
| `JOBBOX_BASE_URL` | `JOBBOX_BASE_URL` |
| `VITE_JOBBOX_APP_URL` | `JOBBOX_APP_URL` |

Then:

```bash
composer install
composer serve
# or: php spark serve --port 8080
```

Open **http://localhost:8080**

Health check: http://localhost:8080/api/health → `{ "ok": true, "sdk": "php", ... }`

## Routes

| Path | Purpose |
|------|---------|
| `/` | All jobs (category chips) |
| `/hr` | HR category locked |
| `/api/health` | SDK health |
| `/api/categories` | `$jobbox->jobs->categories()` |
| `/api/jobs` | `$jobbox->jobs->list(...)` |
| `/api/jobs/{id}` | `$jobbox->jobs->get($id)` |

## Stack

- [CodeIgniter 4](https://codeigniter.com/)
- [`getjobbox/sdk`](../../php) via Composer path repo (`../../php`)
- Ported JobFinder UI (CSS + vanilla JS) from the Vue example

## Notes

- Default port **8080** (Vue uses 5174).
- `.env` is gitignored — never commit plaintext keys.
- Apply links open `{JOBBOX_APP_URL}/j/{id}` (no API key).
