# JobBox Laravel example

Job board demo that mirrors [`../vue`](../vue) / [`../codeigniter`](../codeigniter) and calls JobBox through the **PHP SDK** (`getjobbox/sdk`) inside Laravel.

**Do not put `JOBBOX_API_KEY` in the browser.** Controllers hold the key and expose the same local `/api/*` contract as the Vue example.

## Setup

```bash
cd sdk/examples/laravel
cp .env.example .env
php artisan key:generate
```

Copy these from [`../vue/.env`](../vue/.env) (or create a key in JobBox → Settings → Developer):

| Vue `.env` | Laravel `.env` |
|------------|----------------|
| `JOBBOX_API_KEY` | `JOBBOX_API_KEY` |
| `JOBBOX_BASE_URL` | `JOBBOX_BASE_URL` |
| `VITE_JOBBOX_APP_URL` | `JOBBOX_APP_URL` |

Then:

```bash
composer install
php artisan serve --port=8081
```

Open **http://localhost:8081**

Health check: http://localhost:8081/api/health → `{ "ok": true, "sdk": "php", "example": "laravel" }`

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

- [Laravel](https://laravel.com/) 13
- [`getjobbox/sdk`](../../php) via Composer path repo (`../../php`)
- JobFinder UI (Blade + vanilla JS) ported from the CodeIgniter example

## Notes

- Default port **8081** (CodeIgniter uses 8080).
- `.env` is gitignored — never commit plaintext keys.
- Apply links open `{JOBBOX_APP_URL}/j/{id}` (no API key).
- No database is required for the job board (session/cache default to `file` / `sync` in `.env.example`).
