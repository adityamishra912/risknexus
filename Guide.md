# RiskNexus Setup Guide

This guide describes the current Ubuntu-oriented Go CLI workflow. The CLI performs privileged host setup and is not a Windows installer.

## 1. Prerequisites

The CLI currently targets **Ubuntu 26.04 on amd64** and requires elevated privileges for `start`/`install`. Have the following available:

- Git
- Go 1.22 or a compatible Go toolchain to build the CLI
- Docker and Docker Compose v2
- MySQL client and a host-managed MySQL server
- Apache HTTP Server with PHP and the PHP MySQL extension
- GLPI, or permission to let the CLI download and configure the pinned GLPI release
- permission to install required packages with `apt-get`
- an interactive terminal for hidden MySQL and Gemini password input

The CLI checks `curl`, `wget`, `tar`, Apache, PHP, PHP MySQL support, the MySQL client, Docker, Docker Compose, and GLPI Agent. It installs missing packages after asking for confirmation.

## 2. Clone the Repository

```bash
git clone https://github.com/adityamishra912/risknexus
cd risknexus
```

## 3. Build RiskNexus CLI

The CLI is in `cli/` and its Go module is `github.com/risknexus/cli`.

```bash
cd cli
go build -o risknexus .
sudo install -m 0755 risknexus /usr/local/bin/risknexus
cd ..
```

Run the installed command from the repository root, or use `./cli/risknexus` if you do not install it globally.

## 4. Configure RiskNexus

Run:

```bash
risknexus configure
```

The CLI prompts for:

- RiskNexus host or IP address used by browsers;
- MySQL host;
- MySQL port;
- MySQL database;
- MySQL username;
- MySQL password;
- Gemini API key.

The Gemini API key is **required**. It is collected through hidden/password input. Use a real key interactively; never place a key in this guide or commit it to Git. A placeholder, if needed in private notes, is `<YOUR_GEMINI_API_KEY>`.

The CLI tests the MySQL connection, can create a missing database after confirmation, derives GLPI and API URLs, and writes the protected configuration.

## 5. Install RiskNexus

Run the staged installation as root:

```bash
sudo risknexus install
```

`risknexus start` runs the same staged workflow. The CLI:

1. detects Ubuntu 26.04 amd64, privileges, RAM, and disk;
2. checks dependencies and asks before installing missing packages;
3. loads or prompts for MySQL configuration;
4. detects GLPI or asks before downloading and initializing the configured release;
5. writes and enables the Apache GLPI site;
6. verifies GLPI inventory configuration;
7. installs/configures GLPI Agent and runs `glpi-agent --debug --force`;
8. verifies computer, software, and software-version inventory counts;
9. builds and starts the FastAPI and Next.js Docker Compose services;
10. discovers the backend Docker network and ensures restricted MySQL access for it;
11. checks the FastAPI, Next.js, and Compose service health.

On success, the CLI prints the dashboard, GLPI, and API URLs.

## 6. Running RiskNexus

For an already configured host:

```bash
sudo risknexus start
```

The CLI remains in the foreground after the deployment stages complete so it can receive shutdown signals. Press:

```text
Ctrl+C
```

The current signal handler stops the foreground RiskNexus process and prints a shutdown message. It does not call Docker Compose `down`; running application containers remain managed by Docker until stopped explicitly.

Useful commands are:

```bash
risknexus status
risknexus logs
risknexus stop
risknexus --debug start
```

`risknexus stop` runs Docker Compose `down`, while `risknexus logs` shows the last 100 Compose log lines.

## 7. Accessing RiskNexus

Replace `<RISKNEXUS_HOST>` with the configured host or IP address:

```text
Dashboard: http://<RISKNEXUS_HOST>:3000
GLPI:      http://<RISKNEXUS_HOST>/glpi
API:       http://<RISKNEXUS_HOST>:8000/api/v1
```

FastAPI documentation is available at `http://<RISKNEXUS_HOST>:8000/docs`.

## 8. Data Sources

The Data Sources page exposes the available backend modes and ingestion workflows. The current modes are `sample`, `mysql`, `supabase-primary`, and `supabase-secondary`.

The Agent Data section calls the GLPI table API to discover available tables, lets the user select a table, renders columns and rows, and filters table names and loaded row values through its search field. The backend also exposes paginated GLPI computer, software, software-version, and generic table endpoints.

CSV and ZIP uploads are implemented through the ingestion API and are stored under `backend/data/uploads/{dataset_id}` after required-file checks.

Native connectors for SIEM, IAM, EDR, CSPM, commercial vulnerability-management tools, external asset inventories, and threat-intelligence feeds are planned rather than complete platform integrations.

## 9. Assets

The Assets page reads asset records from the backend. Depending on the active source, those records come from the checked-in CSV dataset, an uploaded dataset, materialized MySQL/Supabase data, or GLPI-related inventory flows. Asset records provide identity, type, criticality, internet exposure, business-service context, relationships, and risk views.

## 10. Risk Quantification

RiskNexus uses a methodology based on the **FAIR (Factor Analysis of Information Risk) methodology**. The current workflow:

1. loads assets, vulnerabilities, threats, controls, services, impacts, and relationships;
2. generates compatible risk scenarios;
3. derives attack-path reachability and feature values;
4. predicts calibrated breach likelihood with the XGBoost model;
5. resolves minimum, likely, and maximum financial impact from configured impact data or business-service downtime data;
6. calculates point-estimate EAL and runs Monte Carlo Bernoulli plus triangular-impact simulations;
7. reports enterprise mean EAL and P90/P95/P99 loss metrics;
8. evaluates control risk reduction and budget-constrained portfolios.

Assets, vulnerabilities, threats, controls, business impact, relationships, and model-derived risk metrics each contribute to the result. The engine does not fabricate financial impact when required data is absent.

## 11. Gemini AI

Gemini is used by the backend Copilot endpoint for risk-context-aware responses.

- `risknexus configure` collects the Gemini API key through hidden/password input.
- The key is written to the protected server-side environment configuration.
- Docker Compose passes `GEMINI_API_KEY` and `GEMINI_MODEL` to the backend service.
- The frontend does not receive or expose `GEMINI_API_KEY`.
- Never commit the key to Git, place it in frontend `NEXT_PUBLIC_*` variables, or paste it into source files.

## 12. Configuration Files

On Linux, new installations use:

```text
/etc/risknexus/.env
```

The CLI writes this file with mode `0600`. A configured `RISKNEXUS_CONFIG_FILE` environment variable takes precedence. Development or Windows runs use `.env` unless an explicit path is configured.

New configuration uses `RISKNEXUS_*` names, including `RISKNEXUS_HOST` and `RISKNEXUS_CONFIG_FILE`. The loader and Compose file retain `CYBERNEXUS_*` fallbacks for older installations, but new installations and documentation should use RiskNexus names.

The file contains MySQL, GLPI URL, API URL, CORS, Gemini, and configuration-path settings. Protect it as a secret file and do not publish its contents.

## 13. Updating RiskNexus

From the repository checkout:

```bash
git pull
cd cli
go build -o risknexus .
sudo install -m 0755 risknexus /usr/local/bin/risknexus
cd ..
sudo risknexus start
```

The `start` workflow rebuilds the application Compose services with the current source and reruns health checks. Preserve and protect the existing `/etc/risknexus/.env` configuration.

## 14. Troubleshooting

Check CLI and application status:

```bash
risknexus status
risknexus --debug start
risknexus logs
```

Inspect Compose services and logs:

```bash
docker compose --env-file /etc/risknexus/.env -f deployment/docker-compose.yml ps
docker compose --env-file /etc/risknexus/.env -f deployment/docker-compose.yml logs --tail=100 backend
docker compose --env-file /etc/risknexus/.env -f deployment/docker-compose.yml logs --tail=100 frontend
```

Check host services:

```bash
systemctl status apache2
systemctl status glpi-agent
journalctl -u glpi-agent
journalctl -u apache2
mysql --version
```

Check HTTP endpoints:

```bash
curl -f http://localhost:8000/
curl -f http://localhost:3000/
curl -f http://localhost/glpi
```

For database failures, verify the protected configuration values, that MySQL is listening on the configured host/port, and that the backend Docker network has the restricted MySQL access provisioned by the CLI.

## 15. Security Notes

- Never commit `.env` files, database passwords, or Gemini API keys.
- Keep `/etc/risknexus/.env` owned and readable only by the required administrator/service accounts.
- Do not expose Gemini through `NEXT_PUBLIC_*` variables or frontend source.
- Protect MySQL credentials and use the CLI's restricted Docker-network access flow.
- The CLI masks the MySQL password in displayed GLPI initialization commands.
- Treat uploaded datasets and GLPI inventory as sensitive technical data.
