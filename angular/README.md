# JobBox Angular example

Official Angular example for the JobBox partner SDKs — same JobFinder board as the [Vue](../vue) and [React](../react) examples.

Built with **Angular 19** standalone components, signals, `OnPush` change detection, a root `JobsStoreService`, and Phosphor web-component icons.

The API key stays on the server. The browser only calls local `/api/*` routes (proxied by the Angular CLI).

## Setup

```bash
cd sdk/examples/angular
cp .env.example .env
# set JOBBOX_API_KEY from JobBox → Settings → Developer
npm install
```

Default UI port is **5178** (Vue `5174`, React `5176`).

## Run with Node SDK (default)

```bash
npm run dev
```

Starts:

1. Express API proxy on `127.0.0.1:5179` (`@getjobbox/sdk`)
2. `ng serve` on [http://127.0.0.1:5178](http://127.0.0.1:5178) with `/api` → `5179`

## Run with Python SDK

```bash
python3 -m pip install -e ../../python
npm run dev:python
```

## Preview production build

```bash
npm run preview
```

## Tests

```bash
npm test
```

## Architecture notes

| Piece | Approach |
|-------|----------|
| Routing | Standalone routes + `title` / `data.lockedCategory` |
| State | Signals in the page; shared cache in `jobs-cache.ts` |
| DI | `JobsStoreService` (`providedIn: 'root'`) |
| Icons | `@phosphor-icons/webcomponents` + `CUSTOM_ELEMENTS_SCHEMA` |
| Styles | Shared JobFinder CSS (`src/styles.css`) |
