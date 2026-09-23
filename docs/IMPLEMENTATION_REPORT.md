# CyberNexus Implementation Report

## Current Status

The CLI now contains a staged `start`/`install` orchestration path for the intended Ubuntu 26.04 amd64 target. It detects the host, checks dependencies, asks before installing missing packages, configures MySQL, installs or reuses GLPI, configures Apache and inventory, installs/configures the GLPI Agent, triggers inventory, verifies MySQL counts, starts the Docker application stack, and checks the HTTP services.

This workflow has **not been executed on a real Ubuntu 26.04 VM in this development environment**. The current environment is Windows and has no Go toolchain, Docker, MySQL, Apache, GLPI, or GLPI Agent. The implementation must therefore be treated as Ubuntu-targeted code awaiting VM acceptance testing, not as a claim that the full clean-machine pipeline has passed.

## Architecture

```text
GLPI Agent -> Apache/GLPI -> host MySQL
                  ^
FastAPI container <- host.docker.internal
    ^
Next.js container <- browser
    ^
Go CLI orchestrates all stages
```

The browser never receives database credentials and never connects directly to MySQL. On Linux, Compose maps `host.docker.internal` to the host gateway and generated configuration sets `MYSQL_HOST_CONTAINER` for the backend container while retaining the real host value for CLI and GLPI operations.

`CYBERNEXUS_HOST` is the browser-facing hostname or IP. For example, `192.168.201.129` generates `http://192.168.201.129/glpi`, `http://192.168.201.129/glpi/front/inventory.php`, and `http://192.168.201.129:8000/api/v1`. `MYSQL_HOST` remains the host-side database address; it is not replaced with `CYBERNEXUS_HOST`.

## `cybernexus start` Workflow

`start` and `install` call the same idempotent function. The stages are:

1. Detect Linux, Ubuntu 26.04, amd64, root privileges, RAM, and disk space.
2. Check `curl`, `wget`, `tar`, Apache, PHP, PHP MySQL support, MySQL client, Docker, Docker Compose, and GLPI Agent.
3. Ask before running `apt-get update` and installing missing packages.
4. Load an existing valid MySQL configuration or prompt for host, port, database, username, and hidden password. Missing databases require an explicit create confirmation.
5. Save the protected environment file and derive `GLPI_URL` and `GLPI_INVENTORY_URL`.
6. Detect GLPI at `CYBERNEXUS_GLPI_PATH` or `/var/www/glpi`. If absent, ask for confirmation, download the pinned GLPI `v10.0.20` release (or the explicit `CYBERNEXUS_GLPI_VERSION` override), extract it, set ownership, and initialize the database only when GLPI tables are not already present.
7. Write an Apache virtual host, enable rewrite, reload Apache, and verify the GLPI URL responds.
8. Query `glpi_configs` for the existing `inventory`/`enabled_inventory` row. If its value is not `1`, update only that row with parameterized SQL and verify the resulting value. A missing row is treated as a configuration error; no row is inserted.
9. Install the GLPI Agent package if missing, write `/etc/glpi-agent/agent.cfg`, enable/start its systemd service, and run `glpi-agent --debug --force`.
10. Count `glpi_computers`, `glpi_softwares`, and `glpi_softwareversions`. Startup fails if no computers were received.
11. Build/start the FastAPI and Next.js Compose services.
12. Check FastAPI, Next.js, and Compose service health, then print local URLs.

Existing GLPI files and a database containing GLPI tables are reused. Database initialization is skipped in that case.

## CLI Commands

```text
cybernexus start       # full staged setup and startup
cybernexus install     # alias for start
cybernexus configure   # prompt, validate, and save MySQL configuration
cybernexus status      # MySQL and GLPI table health; password is redacted
cybernexus stop        # docker compose down
cybernexus logs        # docker compose logs --tail=100
cybernexus --debug start
```

Every external command is printed, streams stdout/stderr, and includes exit code plus captured output on failure. Stage errors include the failing stage and `cybernexus logs` as the next diagnostic action.

## Configuration

The CLI uses `CYBERNEXUS_CONFIG_FILE` when set. Otherwise root Linux runs use `/etc/cybernexus/.env`; non-root/development runs use `.env`. The file is written with mode `0600` and includes:

```text
MYSQL_HOST
MYSQL_HOST_CONTAINER
MYSQL_PORT
MYSQL_DATABASE
MYSQL_USER
MYSQL_PASSWORD
GLPI_URL
GLPI_INVENTORY_URL
CYBERNEXUS_CONFIG_FILE
CYBERNEXUS_HOST
NEXT_PUBLIC_API_URL
```

`CYBERNEXUS_HOST` is the validated hostname or IP address used by browsers. Startup reuses it from the protected configuration or prompts for it on first setup. It generates `GLPI_URL`, `GLPI_INVENTORY_URL`, and `NEXT_PUBLIC_API_URL` without exposing MySQL credentials. `MYSQL_HOST` remains for host-side CLI/GLPI operations; FastAPI uses `MYSQL_HOST_CONTAINER` when supplied by Docker Compose.

Optional installer variables are read from the process environment:

```text
CYBERNEXUS_GLPI_URL=http://localhost/glpi
CYBERNEXUS_GLPI_INVENTORY_URL=http://localhost/glpi/front/inventory.php
CYBERNEXUS_GLPI_PATH=/var/www/glpi
CYBERNEXUS_GLPI_VERSION=v10.0.20
```

The installer defaults to reproducible GLPI release `v10.0.20`. `CYBERNEXUS_GLPI_VERSION` pins another explicit release tag for compatibility testing. Passwords are never printed; the GLPI database initialization command displays `--db-password=********` while the actual process receives the real value.

## FastAPI GLPI API

The router is mounted under `/api/v1/glpi`:

- `GET /tables`
- `GET /tables/{table_name}?page=1&limit=50`
- `GET /computers`
- `GET /softwares`
- `GET /software-versions`

Table names are validated against `information_schema.tables` and an identifier allow-list. Limits are bounded to 500 rows. Backend failures are logged with tracebacks while API responses remain safe. FastAPI accepts the CLI's MySQL environment values and never sends credentials to the browser.

## Frontend and Compose

`/glpi-data` discovers all tables dynamically and renders selected columns and rows with bounded requests. Existing CRQ routes and the Data Sources page remain unchanged; the sidebar adds GLPI Data and the page includes `Main | GLPI Data | Assets`.

`deployment/docker-compose.yml` builds the existing backend and frontend. MySQL and GLPI stay host-managed to avoid creating a conflicting second database. Backend Compose configuration uses the generated environment file, passes `MYSQL_HOST_CONTAINER`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, and `MYSQL_PASSWORD`, and maps `host.docker.internal:host-gateway`. `NEXT_PUBLIC_API_URL` is supplied as a frontend build argument so it is embedded in the Next.js client bundle.

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

## Development Checks

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
- GLPI inventory configuration uses the existing MySQL connection and never invokes a GLPI console inventory command.
- FastAPI GLPI connection and query failures use `logger.exception`, preserving traceback in server logs.
- Frontend request failures include the endpoint, status, and response body where available.
- Compose logs remain available through `docker compose logs` and `cybernexus logs`.
- Passwords and other secrets are excluded from status output and frontend responses.

## Verification

Verified in this workspace:

```text
python -m compileall backend/app       PASS
frontend npm run build                 PASS
workspace diagnostics for changed API/UI files PASS
```

Not executable in this workspace:

```text
go test ./...                          Go is not installed
pytest                                 pytest is not installed
sudo ./cybernexus start                requires Ubuntu 26.04 and root services
```

Required target-VM acceptance commands:

```text
cd cli
gofmt -w .
go test ./...
go build -o cybernexus .
sudo ./cybernexus start
curl http://localhost:8000/api/v1/glpi/tables
```

## Known Limitations

- The Ubuntu workflow is implemented but not yet proven on the requested clean Ubuntu 26.04 VM.
- GLPI package compatibility, the exact inventory console command, and the pinned release archive layout must be confirmed during VM testing.
- The pinned archive URL does not currently enforce a checksum; checksum verification should be added when a trusted release checksum source is selected.
- The installer assumes Apache, systemd, apt, and a MySQL account with permission to create/use the configured database.
- The frontend table viewer requests page 1; the API supports pagination, but next/previous UI controls are still a follow-up.

## Troubleshooting

Use `sudo ./cybernexus --debug start` for command context and streamed errors. Use `sudo ./cybernexus logs` for application container logs, `systemctl status glpi-agent` for agent state, `journalctl -u glpi-agent` for agent logs, and Apache's error log for GLPI HTTP failures. A failed run stops at its stage and does not report that CyberNexus is ready.
