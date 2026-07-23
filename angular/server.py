#!/usr/bin/env python3
"""
API proxy for the Angular jobs demo using the Python getjobbox SDK.
Same /api/* contract as server.mjs - run with: npm run dev:python
"""

from __future__ import annotations

import json
import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

# Prefer editable install; fall back to repo src layout.
_REPO_PYTHON_SRC = Path(__file__).resolve().parents[2] / "python" / "src"
if _REPO_PYTHON_SRC.is_dir():
    sys.path.insert(0, str(_REPO_PYTHON_SRC))

from getjobbox import JobBox, JobBoxApiError, JobBoxNetworkError  # noqa: E402


def load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        os.environ.setdefault(key, value)


ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

API_KEY = (os.environ.get("JOBBOX_API_KEY") or "").strip()
BASE_URL = (os.environ.get("JOBBOX_BASE_URL") or "https://api.getjobbox.com").rstrip("/")
HOST = os.environ.get("PYTHON_API_HOST") or "127.0.0.1"
PORT = int(os.environ.get("PYTHON_API_PORT") or os.environ.get("PORT_API") or "5175")

if not API_KEY:
    print("Missing JOBBOX_API_KEY. Copy .env.example → .env and set your key.", file=sys.stderr)
    sys.exit(1)

jobbox = JobBox(api_key=API_KEY, base_url=BASE_URL, app_name="angular-jobs-demo")


def json_response(handler: BaseHTTPRequestHandler, status: int, body: dict) -> None:
    payload = json.dumps(body).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(payload)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(payload)


def sdk_error(handler: BaseHTTPRequestHandler, err: BaseException, label: str) -> None:
    print(f"[{label}]", err, file=sys.stderr)
    if isinstance(err, JobBoxApiError):
        json_response(
            handler,
            err.status or 502,
            {"message": str(err), "code": err.code},
        )
        return
    if isinstance(err, JobBoxNetworkError):
        json_response(handler, 502, {"message": str(err)})
        return
    traceback.print_exc()
    json_response(handler, 502, {"message": f"Failed to fetch {label}"})


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        qs = parse_qs(parsed.query)

        try:
            if path == "/api/health":
                json_response(
                    self,
                    200,
                    {"ok": True, "baseUrl": BASE_URL, "sdk": "python"},
                )
                return

            if path == "/api/categories":
                result = jobbox.jobs.categories()
                categories = result.get("categories") if isinstance(result, dict) else None
                json_response(
                    self,
                    200,
                    {"categories": categories if isinstance(categories, list) else []},
                )
                return

            if path == "/api/jobs":
                search = (qs.get("search") or [""])[0].strip()
                category = (qs.get("category") or [""])[0].strip()
                try:
                    page = max(1, int((qs.get("page") or ["1"])[0]))
                except ValueError:
                    page = 1
                try:
                    per_page = min(50, max(1, int((qs.get("perPage") or ["12"])[0])))
                except ValueError:
                    per_page = 12

                result = jobbox.jobs.list(
                    search=search or None,
                    category=category or None,
                    page=page,
                    per_page=per_page,
                )
                json_response(
                    self,
                    200,
                    {
                        "jobs": result.get("jobs") or [],
                        "total": result.get("total") or 0,
                        "page": result.get("page") or page,
                        "perPage": result.get("per_page") or per_page,
                    },
                )
                return

            if path.startswith("/api/jobs/"):
                job_id = path[len("/api/jobs/") :].strip()
                if not job_id or "/" in job_id:
                    json_response(self, 400, {"message": "Job id is required"})
                    return
                result = jobbox.jobs.get(job_id)
                json_response(self, 200, {"job": result.get("job")})
                return

            json_response(self, 404, {"message": "Not found"})
        except Exception as err:  # noqa: BLE001
            label = path.rsplit("/", 1)[-1] or "api"
            sdk_error(self, err, label)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"JobBox Python API   → http://{HOST}:{PORT}")
    print(f"SDK                 → getjobbox (Python)")
    print(f"SDK base URL        → {BASE_URL}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Python API")
        server.server_close()


if __name__ == "__main__":
    main()
