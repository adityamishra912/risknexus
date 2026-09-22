# CyberNexus Implementation Report

## Status

This milestone adds the local MySQL configuration boundary, a read-only GLPI table API, a generic Next.js GLPI data viewer, a first Docker Compose definition, and the initial Go CLI skeleton. Existing CRQ routes, risk calculations, and the Data Sources page remain in place.

The current repository is still a development prototype. GLPI and the GLPI Agent are not installed or configured automatically by this change, because that requires a Linux package/service workflow and a target GLPI version. The compose stack intentionally does not create a second MySQL or GLPI instance.

## Architecture

```text
Go CLI -> protected .env -> FastAPI -> local MySQL/GLPI
                                      ^
Next.js frontend ---------------------+
```

The browser only calls FastAPI. MySQL credentials are loaded by FastAPI from environment variables and are never returned to Next.js.

## Implemented Components

### Go CLI

The module is in `cli/` and exposes:

- `cybernexus configure`: prompts for host, port, database, username, and a hidden password; tests the connection; optionally creates a missing database; then saves the configuration.
- `cybernexus install`: currently runs the same idempotent MySQL configuration flow as `configure`.
- `cybernexus status`: checks MySQL connectivity and reports the configured host, port, database, user, and whether expected GLPI tables exist. Passwords are always redacted.
- `cybernexus start`: runs `docker compose -f deployment/docker-compose.yml up -d`.
- `cybernexus stop`: runs the matching `docker compose ... down` command.
- `cybernexus logs`: runs `docker compose ... logs --tail=100`.
- `--debug`: reserved for verbose command diagnostics; subprocess stdout and stderr are streamed by the command runner.

The CLI uses `CYBERNEXUS_CONFIG_FILE` when set. On a Linux root session it defaults to `/etc/cybernexus/.env`; otherwise it defaults to `.env`. The file is created with mode `0600`. The `.env` file is ignored by Git.

The MySQL flow refuses to save incomplete values, validates ports and identifiers, handles missing databases explicitly, and never prints a password. A database may be empty while GLPI is being installed; the CLI reports that condition instead of claiming that it is a valid GLPI database.

### FastAPI GLPI API

The new router is mounted below `/api/v1/glpi`:

- `GET /api/v1/glpi/tables`
- `GET /api/v1/glpi/tables/{table_name}?page=1&limit=50`
- `GET /api/v1/glpi/computers`
- `GET /api/v1/glpi/softwares`
- `GET /api/v1/glpi/software-versions`

Table names are first checked against `information_schema.tables`. Identifiers must match an alphanumeric/underscore allow-list, and pagination is limited to 500 rows. Values are passed as query parameters where possible. Connection and query failures are logged with tracebacks server-side while responses expose safe messages.

FastAPI accepts the CLI's `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, and `MYSQL_PASSWORD` values. It reads `.env` from the backend working directory or its parent for local development.

### Next.js

`/glpi-data` discovers the table list dynamically and renders any selected table using returned columns and rows. It includes pagination-compatible requests and an explicit `Main | GLPI Data | Assets` navigation strip. The existing sidebar gains a GLPI Data entry; existing pages are unchanged.

Frontend API errors include URL, HTTP status, and response detail in the visible error state and browser console. Credentials are not referenced by frontend code.

### Deployment

`deployment/docker-compose.yml` builds the existing backend and the new frontend image. It expects the root `.env` file and maps backend port 8000 and frontend port 3000. MySQL and GLPI remain host-managed to avoid conflicting with an existing installation.

## Configuration

Copy `.env.example` to `.env` for development, or let the CLI create the protected Linux configuration file:

```text
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=glpi
MYSQL_USER=glpi_user
MYSQL_PASSWORD=<not committed>
GLPI_ENABLED=true
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Never place real credentials in Git. The frontend only needs `NEXT_PUBLIC_API_URL`; do not prefix database variables with `NEXT_PUBLIC_`.

## Development Commands

Backend:

```text
cd backend
python -m venv venv
venv\\Scripts\\activate       # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```text
cd frontend
npm install
npm run dev
```

CLI:

```text
cd cli
go mod download
go run . configure
go run . --debug status
```

Compose:

```text
docker compose -f deployment/docker-compose.yml up --build
```

## Verification

Python syntax can be checked with:

```text
python -m compileall backend/app
```

The backend test suite remains the existing CRQ suite:

```text
cd backend
pytest
```

The frontend checks are:

```text
cd frontend
npm run lint
npm run build
```

The Go module should be checked on a machine with Go installed:

```text
cd cli
gofmt -w .
go test ./...
go build -o cybernexus .
```

## Error and Log Behavior

- CLI command failures include the command and exit code; child stdout/stderr is streamed.
- FastAPI GLPI connection and query failures use `logger.exception`, preserving traceback in server logs.
- Frontend request failures include the endpoint, status, and response body where available.
- Compose logs remain available through `docker compose logs` and `cybernexus logs`.
- Passwords and other secrets are excluded from status output and frontend responses.

## Remaining Work

A clean Ubuntu milestone still needs a tested installer for Apache/PHP, GLPI download/configuration, GLPI Inventory enablement, architecture-specific GLPI Agent installation, service management, inventory trigger, and post-collection verification. Those operations should be added behind the same CLI command runner with explicit stages and diagnostics rather than silently assumed by the current prototype.
