# RiskNexus – Complete Runtime Flow and Supabase Integration Design

This report documents the app as it actually works today, without changing its current behavior, and then proposes a Supabase-backed data-source mode that preserves the existing CSV/ingestion flow while adding an additional database-driven option.

## 1) Project structure and runtime model

The project is split into:

- Backend: FastAPI app under `backend/app`
- Frontend: Next.js app under `frontend`
- Source data: CSV files under `backend/data`
- Risk engine logic: Monte Carlo + attack graph + optimizer + ML

The backend is mounted at:

- `/api/v1`

The frontend base URL is configured in:

- `frontend/lib/api/client.js`

Default API base:

- `http://localhost:8000/api/v1`

The frontend global state lives in:

- `frontend/providers/RiskProvider.js`

This is the primary orchestration layer for almost all data collection.

---

## 2) The current backend data source model

The app is not using a database in its current runtime flow. It reads actual CSV files in the backend data directory:

- `backend/data/assets.csv`
- `backend/data/vulnerabilities.csv`
- `backend/data/control_status.csv`
- `backend/data/control_effectiveness.csv`
- `backend/data/controls.csv`
- `backend/data/business_services.csv`
- `backend/data/threat_scenarios.csv`
- `backend/data/asset_relationships.csv`
- `backend/data/relationship_weights.csv`
- `backend/data/threat_asset_impacts.csv`
- `backend/data/business_units.csv`
- `backend/data/vulnerability_threat_rules.csv`

The critical logic is:

- `backend/app/core/config.py` sets `ACTIVE_DATASET` default to `Dataset1` and the backend resolves the active directory via `resolve_data_dir()`.
- `backend/app/services/attack_graph/graph_builder.py` chooses the working data directory and builds a NetworkX graph from asset + relationship + vulnerability records.
- `backend/app/services/risk_engine/engine.py` quantifies scenarios using ML + financial impact + Monte Carlo simulation.
- `backend/app/services/optimizer/service.py` computes marginal risk-reduction candidates and runs portfolio optimization.

So, today, the app is “CSV-first” by design, with “inherited data source” behavior driven by files and dataset folders.

---

## 3) Startup and root API flow

### 3.1 Startup

File:

- `backend/app/main.py`

What happens on startup:

- FastAPI app is created.
- CORS is enabled.
- The router is mounted under `/api/v1`.
- A background task launches `quantify_all_scenarios` in a thread to pre-warm scenario cache.

Important code path:

- `app.include_router(api_router, prefix=settings.API_V1_STR)`
- `@app.on_event("startup")` -> `quantify_all_scenarios`

Output from root endpoint:

- `GET /` returns:
  - message
  - version
  - docs path

---

## 4) Full front-end data-loading sequence

File:

- `frontend/providers/RiskProvider.js`

On first provider mount, this function runs once:

- `loadAllData()`

It calls these backend endpoints in one batch with `Promise.allSettled()`:

1. `GET /risk`
2. `GET /assets`
3. `GET /vulnerabilities`
4. `GET /attack-paths`
5. `GET /optimization/initiatives`
6. `GET /assets/top-risk`
7. `GET /risk/top-drivers`
8. `GET /risk/by-business-unit`
9. `GET /risk/trend`
10. `GET /risk/loss-distribution`

The provider stores results in state variables like:

- `apiSummary`
- `assetsList`
- `topRiskAssets`
- `topRiskDrivers`
- `vulnerabilitiesList`
- `attackGraphData`
- `initiativesList`
- `businessUnitData`
- `riskTrendData`
- `lossDistributionData`

Then the provider exposes these values to pages through context.

### 4.1 Exact request shape

From `frontend/lib/api/client.js`:

- `fetchAPI(endpoint, options)` builds a `fetch()` request to `${API_BASE_URL}${endpoint}`
- For GET requests, `apiClient.get()` turns params into a query string
- For POST requests, `apiClient.post()` JSON-stringifies the payload

### 4.2 Exact frontend API wrappers

Files used:

- `frontend/lib/api/risk.js`
- `frontend/lib/api/assets.js`
- `frontend/lib/api/optimization.js`
- `frontend/lib/api/whatIf.js`
- `frontend/lib/api/attackPaths.js`
- `frontend/lib/api/ingestion.js`

---

## 5) Endpoint-by-endpoint runtime map

### 5.1 Ingestion endpoints

#### Endpoint: `GET /api/v1/ingestion`

File:

- `backend/app/api/ingestion.py`

Caller:

- `frontend/lib/api/ingestion.js` -> `getDatasets()`
- likely used by the Data Sources page when listing available uploaded datasets

Input:

- no request body
- no query parameters

Backend action:

- `list_datasets()`
- implemented in `backend/app/services/ingestion/service.py`

Output:

- `status`
- `count`
- `datasets`

Each dataset entry contains:

- dataset_id
- name
- path
- is_default

#### Endpoint: `POST /api/v1/ingestion/upload`

File:

- `backend/app/api/ingestion.py`

Caller:

- `frontend/lib/api/ingestion.js` -> `uploadDataset(formData)`
- Data Sources page uploads CSV/ZIP files

Input:

- multipart form `files` list
- each file is an uploaded CSV or ZIP payload

Backend action:

- `save_customer_dataset(files)`
- validates presence of required CSVs and stores them under `backend/data/uploads/{dataset_id}/`

Output:

- `status`
- `dataset_id`
- `dataset_path`
- `saved_files`
- `all_files`
- `missing_required`
- `ingestion_status`

This is the app’s manual onboarding/integration path for custom datasets.

---

### 5.2 Asset endpoints

#### Endpoint: `GET /api/v1/assets`

File:

- `backend/app/api/assets.py`

Caller:

- `frontend/lib/api/assets.js` -> `getAssetsList(params = {})`
- used in `RiskProvider.js` during `loadAllData()`

Backend service:

- `get_all_assets_with_risk()`
- file: `backend/app/services/assets/service.py`

Input:

- optional `limit`
- optional `data_dir`

Output:

- `status`
- `total_assets`
- `assets[]`

Per asset output includes:

- id
- name
- type
- service_id
- service_name
- criticality
- internet_exposed
- environment
- owner
- total_eal
- formatted_eal
- max_p95
- max_probability
- vulnerabilities_count
- controls_count
- scenarios_count

#### Endpoint: `GET /api/v1/assets/top-risk`

Caller:

- `frontend/lib/api/assets.js` -> `getTopRiskAssets(limit = 10)`
- called in `RiskProvider.js`

Input:

- `limit=10`

Backend service:

- `get_top_risk_assets()`

Output:

- status
- count
- top_assets[]

Each item is mapped in frontend to display cards and risk percentages.

#### Endpoint: `GET /api/v1/assets/{asset_id}`

Caller:

- `frontend` asset detail pages or selection flows

Input:

- `asset_id` path param

Backend action:

- `get_asset_detail_profile()`

Output:

- asset metadata
- business_service
- financial_exposure
- vulnerabilities
- controls
- attack_paths
- risk_scenarios
- top_risk_drivers

---

### 5.3 Vulnerability endpoints

#### Endpoint: `GET /api/v1/vulnerabilities`

File:

- `backend/app/api/vulnerabilities.py`

Caller:

- `frontend/lib/api/vulnerabilities.js` (not shown in the search, but likely used to populate vulnerability lists)
- included in `RiskProvider.js` via `getVulnerabilities()`

Backend service:

- `get_vulnerabilities_list()`
- file: `backend/app/services/vulnerabilities/service.py`

Input:

- optional `limit`
- optional `data_dir`

Output:

- status
- count
- vulnerabilities[]

Per item includes:

- vulnerability_id
- cve
- cve_id
- title
- description
- cvss_score
- severity
- known_exploited
- days_open
- patch_available
- affected_assets_count
- priority_score
- financial_exposure
- threat_scenarios_linked
- remediation_effort

#### Endpoint: `GET /api/v1/vulnerabilities/{cve_id}`

Input:

- specific CVE string

Output:

- status
- vulnerability

---

### 5.4 Attack-path endpoints

#### Endpoint: `GET /api/v1/attack-paths`

File:

- `backend/app/api/attack_paths.py`

Caller:

- `frontend/lib/api/attackPaths.js` -> `getAttackPathsAnalysis(params = {})`
- called by `RiskProvider.js` during initial load

Input:

- `max_path_length` default 5
- `min_criticality` default 8
- optional `data_dir`

Backend action:

- `build_attack_graph()`
- `get_entry_points()`
- `get_critical_targets()`
- `find_attack_paths()`
- `rank_attack_paths()`

Output:

- summary
- nodes[]
- edges[]
- entry_points[]
- target_assets[]
- critical_paths[]

This is the graph used for attack path visualization and asset-to-asset exploitation modeling.

#### Endpoint: `GET /api/v1/attack-paths/graph`

Caller:

- graph-specific UI components

Output:

- nodes_count
- edges_count
- nodes[]
- edges[]

---

### 5.5 Risk-engine endpoints

#### Endpoint: `GET /api/v1/risk`

File:

- `backend/app/api/risk.py`

Caller:

- `frontend/lib/api/risk.js` -> `getRiskScenarios(params = {})`
- called by `RiskProvider.js`

Input:

- optional `data_dir`
- optional `limit`

Backend action:

- `quantify_all_scenarios()`
- `run_enterprise_monte_carlo()`

Important output fields:

- summary:
  - total_scenarios
  - total_technical_scenarios
  - total_loss_events
  - total_eal
  - technical_scenario_exposure
  - mean_eal
  - p90_loss
  - p95_loss
  - p99_loss
  - high_risk_scenarios_count

Also returns:

- scenarios[]
- loss_events[]

This is the main enterprise risk summary used by dashboard cards.

#### Endpoint: `POST /api/v1/risk/scenarios/generate`

Caller:

- `frontend/lib/api/risk.js` -> `triggerScenarioGeneration(payload = { scope: {} })`

Input:

- request schema `GenerateScenarioRequestSchema`
- includes `scope` with optional asset/service filters

Backend action:

- `generate_risk_scenarios()`
- clears scenario cache
- stores run metadata in `_last_generated_scenarios`

Output:

- run_id
- generated_at
- status
- scenario_count
- scenarios[]
- note

#### Endpoint: `GET /api/v1/risk/scenarios/generated`

Caller:

- frontend scenario listing or filtered analytics screens

Input:

- limit
- offset
- asset_id
- threat_id
- service_id
- min_cvss
- known_exploited_only

Output:

- total
- limit
- offset
- scenario_count
- scenarios[]
- run_meta

#### Endpoint: `GET /api/v1/risk/top-drivers`

Caller:

- `frontend/lib/api/risk.js` -> `getTopRiskDrivers(limit = 10)`
- called in `RiskProvider.js`

Input:

- limit

Output:

- status
- count
- top_drivers[]

Each item includes:

- rank
- scenario_id
- scenario_name
- threat
- asset
- asset_id
- likelihood
- likelihood_formatted
- eal
- eal_formatted
- p95
- p95_formatted
- confidence
- attack_path
- contributing_vulnerabilities
- existing_controls

#### Endpoint: `GET /api/v1/risk/by-business-unit`

Caller:

- `frontend/lib/api/risk.js` -> `getBusinessUnitRisk()`
- called in `RiskProvider.js`

Input:

- none

Output:

- total_technical_scenario_exposure
- business_units[]

Each BU item contains:

- service_id
- service_name
- eal
- eal_formatted
- percent
- asset_count

#### Endpoint: `GET /api/v1/risk/trend`

Caller:

- `frontend/lib/api/risk.js` -> `getRiskTrend(days = 30)`
- called in `RiskProvider.js`

Input:

- `days` query param (default 30)

Output:

- snapshots[]
- has_history
- snapshot_count

Data is read from `risk_snapshots.csv` if it exists.

#### Endpoint: `GET /api/v1/risk/loss-distribution`

Caller:

- `frontend/lib/api/risk.js` -> `getLossDistribution(buckets = 30)`
- called in `RiskProvider.js`

Input:

- `buckets`

Output:

- curve[]
- mean_eal
- p90
- p95
- p99
- iterations
- source

This is the empirical exceedance probability curve generated via Monte Carlo.

#### Endpoint: `GET /api/v1/risk/scenarios/{scenario_id}`

Caller:

- direct single-scenario fetches from UI

Output:

- one fully quantified scenario object

#### Endpoint: `POST /api/v1/risk/evaluate`

Caller:

- `frontend/lib/api/risk.js` -> `evaluateCustomScenario(payload)`

Input:

- asset_criticality
- internet_exposed
- cvss_score
- known_exploited
- days_open
- downtime_cost_per_hour
- mfa_enabled
- edr_enabled

Output:

- a single quantified risk scenario result

---

### 5.6 Optimization endpoints

#### Endpoint: `GET /api/v1/optimization/initiatives`

File:

- `backend/app/api/optimization.py`

Caller:

- `frontend/lib/api/optimization.js` -> `getInitiatives(params = {})`
- called in `RiskProvider.js`

Input:

- optional `data_dir`

Backend action:

- `get_candidate_controls()`
- file: `backend/app/services/optimizer/service.py`

Output:

- `status`
- `count`
- `initiatives[]`

Each initiative contains:

- control_id
- control_name
- control_type
- cost
- risk_reduction
- effectiveness_pct
- source_citation
- benefit_cost_ratio

#### Endpoint: `POST /api/v1/optimization/evaluate`

Caller:

- `frontend/providers/RiskProvider.js` debounce effect triggers `evaluatePortfolio({ selected_initiative_ids, budget, objective })`

Input:

- selected_initiative_ids[]
- budget
- objective
- include_curve (default false)

Output:

- status
- budget
- selected_initiative_ids[]
- selected_initiatives[]
- unselected_initiatives[]
- total_selected_investment
- total_expected_risk_reduction
- current_eal
- residual_eal
- budget_remaining
- portfolio_rosi
- investment_curve[]
- solver_status

This is the optimization engine used in the optimizer page and dashboard summary.

#### Endpoint: `POST /api/v1/optimization/recommend`

Similar to evaluate, but runs the optimizer without requiring a current set of selected controls.

---

### 5.7 What-if simulation endpoints

#### Endpoint: `POST /api/v1/what-if/simulate-controls`

File:

- `backend/app/api/what_if.py`

Caller:

- `frontend/lib/api/whatIf.js` -> `simulateControlToggles(payload)`
- triggered by `RiskProvider.js` debounce effect when `simulatedControls`, `mfaCoverage`, or `patchDelayDays` change

Input:

- `simulated_controls` object
- `mfa_coverage`
- `patch_delay_days`
- optional `data_dir`

Output:

- enterprise simulation result, including revised risk metrics under the toggled controls

This is what powers the simulator screen and the control toggles UX.

#### Endpoint: `POST /api/v1/what-if/scenario`

Input:

- scenario_id or scenario_data + changes

Output:

- one scenario simulation result after hypothetical modifications

#### Endpoint: `POST /api/v1/what-if/portfolio`

Input:

- changes
- scope_asset_ids
- iterations

Output:

- portfolio-level what-if forecast

---

## 6) When each API is called in the app lifecycle

### On app startup

- root GET `/`
- background `GET /risk` is pre-warmed indirectly through startup task, but the real UI fetches happen on mount

### On frontend mount

- provider `loadAllData()` runs once
- calls the initial data bundle

### When the dashboard is active

- summary uses `apiSummary` from `/risk`
- top risk assets from `/assets/top-risk`
- top drivers from `/risk/top-drivers`
- business unit risk from `/risk/by-business-unit`
- loss distribution from `/risk/loss-distribution`
- trend from `/risk/trend`

### When the user changes optimization selection

- `RiskProvider.js` sets a debounce timer
- `evaluatePortfolio()` -> `POST /optimization/evaluate`

### When the user changes simulator toggles

- `RiskProvider.js` sets another debounce timer
- `simulateControlToggles()` -> `POST /what-if/simulate-controls`

### When the user uploads dataset files

- `Data Sources` page -> `POST /ingestion/upload`

---

## 7) Where the source data is actually used in logic

The main quantification chain is:

1. `generate_risk_scenarios()`
   - file: `backend/app/services/risk_engine/scenario_generator.py`
2. `build_feature_vector()`
   - file: `backend/app/services/ml/feature_builder.py`
3. `predictor_service.predict_likelihood()`
   - file: `backend/app/services/ml/predictor.py`
4. `resolve_triangular_financial_impact()`
   - file: `backend/app/services/risk_engine/impact.py`
5. `run_monte_carlo_simulation()`
   - file: `backend/app/services/monte_carlo/simulator.py`
6. `consolidate_scenarios_into_loss_events()`
   - file: `backend/app/services/risk_engine/loss_event_consolidator.py`
7. `run_enterprise_monte_carlo()`
   - file: `backend/app/services/monte_carlo/simulator.py`

This produces:

- scenario probability
- confidence
- impact distribution
- EAL
- P90 / P95 / P99
- aggregated enterprise loss curve

---

## 8) What the app expects as input values

The backend expects the following main datasets and fields:

### Assets

Required columns (conceptually):

- asset_id
- asset_name
- asset_type
- service_id
- criticality
- internet_exposed
- environment
- owner

### Business services

- service_id
- unit_id or business unit mapping
- service_name
- criticality
- revenue_dependency
- downtime_cost_per_hour
- data_sensitivity

### Vulnerabilities

- vulnerability_id
- asset_id
- cve_id
- cvss_score
- severity
- exploitability
- known_exploited
- first_seen
- days_open
- patch_available

### Controls

- control_id
- control_name
- category
- cost
- implementation_days
- maintenance_cost

### Control status

- asset_id
- control_id
- status
- coverage
- maturity
- last_assessed

### Control effectiveness

- control_id
- threat_id
- effectiveness_base or effectiveness_pct
- evidence_type

### Threat scenarios

- threat_id
- threat_name
- category
- activity_level
- attack_vector
- intelligence_source
- annual_frequency_low
- annual_frequency_base
- annual_frequency_high
- frequency_unit

### Relationships

- source_asset
- destination_asset
- relationship
- access_type

### Vulnerability-to-threat mapping

- vulnerability_id
- threat_id

This is exactly the canonical dataset structure the current app relies on.

---

## 9) Supabase integration design: preserve CSV mode and add database mode

The safest change is not to replace the current CSV engine. Instead, add a mode switch with two operating modes:

- `csv` mode (current behavior, default)
- `database` mode (new option using Supabase)

### 9.1 Recommended frontend state

Add a data-source selector in the Data Sources page and/or global settings:

- `data_source_mode: 'csv' | 'supabase'`
- `supabase_project_id`
- `supabase_url`
- `supabase_anon_key`
- `supabase_table_prefix` (optional)

Behavior:

- If mode is `csv`, the app continues to use current file-based `data_dir` flow
- If mode is `supabase`, a new adapter loads rows from Supabase tables into the same in-memory structures that the existing route logic expects
- All downstream calculations remain the same

This keeps the previous thing intact while adding the new database-based path as an additional option.

### 9.2 Recommended backend architecture

Add a data-source abstraction layer:

- `backend/app/services/data_sources/base_provider.py`
- `backend/app/services/data_sources/csv_provider.py`
- `backend/app/services/data_sources/supabase_provider.py`

The provider should expose a common interface:

- `load_assets()`
- `load_vulnerabilities()`
- `load_controls()`
- `load_control_status()`
- `load_effectiveness()`
- `load_services()`
- `load_relationships()`
- `load_threat_scenarios()`
- `load_risk_snapshots()`

Then the app decides:

- `csv` mode -> current file readers
- `supabase` mode -> provider fetches rows from Supabase and normalizes them into same dictionaries expected by the risk engine

This is the most minimal and low-risk way to support both sources without rewriting risk logic.

---

## 10) Recommended Supabase database schema

The cleanest approach is to mirror the project’s current canonical CSV model directly into tables. That means the database should be organized around the same entities already used by the quantification engine.

### Total recommended table count

Minimum practical design: 10 core tables

1. `organizations`
2. `data_sources`
3. `business_units`
4. `business_services`
5. `assets`
6. `asset_relationships`
7. `vulnerabilities`
8. `controls`
9. `control_status`
10. `control_effectiveness`
11. `threat_scenarios`
12. `vulnerability_threat_rules`
13. `risk_snapshots`

This is a good production shape. If you want the leanest version, you can also combine `business_units` and `business_services` into one table depending on your product scope.

### 10.1 Table 1: `organizations`

Purpose: top-level tenant/workspace

Columns:

- id (uuid, primary key)
- name
- created_at
- updated_at
- status

### 10.2 Table 2: `data_sources`

Purpose: stores active source mode and source metadata

Columns:

- id (uuid)
- organization_id (uuid)
- source_mode (text: csv | supabase)
- source_name
- source_type (csv, supabase, api, upload)
- is_active (bool)
- dataset_path or supabase schema name
- created_at
- updated_at

### 10.3 Table 3: `business_units`

Columns:

- id (uuid or text)
- organization_id
- unit_id (string)
- unit_name
- description
- created_at

### 10.4 Table 4: `business_services`

Columns:

- id (uuid or text)
- organization_id
- service_id (string, unique)
- unit_id (foreign key to business_units)
- service_name
- criticality
- revenue_dependency
- downtime_cost_per_hour
- data_sensitivity
- created_at
- updated_at

### 10.5 Table 5: `assets`

This is one of the most important tables.

Columns:

- id (uuid or text)
- organization_id
- asset_id (string, unique)
- asset_name
- asset_type
- service_id (foreign key to business_services)
- criticality
- internet_exposed (bool)
- environment
- owner
- created_at
- updated_at

### 10.6 Table 6: `asset_relationships`

Columns:

- id (uuid)
- organization_id
- source_asset (string -> assets.asset_id)
- destination_asset (string -> assets.asset_id)
- relationship
- access_type
- weight
- created_at

### 10.7 Table 7: `vulnerabilities`

Columns:

- id (uuid or text)
- organization_id
- vulnerability_id (string, unique)
- asset_id (string -> assets.asset_id)
- cve_id
- cvss_score
- severity
- exploitability
- known_exploited (bool)
- first_seen
- days_open
- patch_available (bool)
- vulnerability_type
- created_at

### 10.8 Table 8: `controls`

Columns:

- id (uuid or text)
- organization_id
- control_id (string, unique)
- control_name
- category
- cost
- implementation_days
- maintenance_cost
- created_at

### 10.9 Table 9: `control_status`

Columns:

- id (uuid)
- organization_id
- asset_id (string -> assets.asset_id)
- control_id (string -> controls.control_id)
- status
- coverage
- maturity
- last_assessed
- created_at

### 10.10 Table 10: `control_effectiveness`

Columns:

- id (uuid)
- organization_id
- control_id (string)
- threat_id (string)
- effectiveness_base
- effectiveness_pct
- evidence_type
- source_reference
- created_at

### 10.11 Table 11: `threat_scenarios`

Columns:

- id (uuid or text)
- organization_id
- threat_id (string, unique)
- threat_name
- category
- activity_level
- attack_vector
- intelligence_source
- annual_frequency_low
- annual_frequency_base
- annual_frequency_high
- frequency_unit
- frequency_source
- last_updated

### 10.12 Table 12: `vulnerability_threat_rules`

Columns:

- id (uuid)
- organization_id
- vulnerability_id (string)
- threat_id (string)
- rule_weight
- source
- created_at

### 10.13 Table 13: `risk_snapshots`

This supports `/risk/trend` and historical trend charts.

Columns:

- id (uuid)
- organization_id
- date
- technical_scenario_exposure
- enterprise_eal
- p90
- p95
- p99
- created_at

---

## 11) What values to store exactly for each table

The key principle is to store the same canonical values the current CSV-based engine already uses. Do not store reformatted UI-only fields unless they are useful for reporting.

### Store raw values only, not frontend-computed values

For example:

- Do not store display strings like `₹42L` in the database
- Store raw numeric values such as `4200000.0` and let the backend format them when returning API payloads

This keeps the system consistent with the current backend architecture and avoids duplicated logic.

### Example field values to keep

- `criticality`: integer 1-10
- `internet_exposed`: boolean
- `cvss_score`: number 0-10
- `known_exploited`: boolean
- `days_open`: integer
- `cost`: monetary value in INR
- `coverage`: 0-1 fraction
- `maturity`: 0-5 score
- `probability`: float 0-1
- `eal`: monetary EAL
- `p95`: monetary P95 loss
- `annual_frequency_*`: rate values

---

## 12) How to make the app “read from database directly” without breaking the current flow

The best design is a provider selection layer:

### Option A: Single source abstraction (recommended)

- Add `data_source_mode` in settings or UI state
- If mode = `csv`, call the existing file-based exporters
- If mode = `supabase`, call a new `SupabaseDataProvider`
- Both providers return the same normalized dictionaries

That means the risk engine, optimizer, and attack graph code do not need to change, because they still receive the same business objects.

### Option B: Route-specific database adapters

- Each FastAPI route checks the request parameter or environment setting
- If `source=database`, it loads data from the database instead of CSV

This is simpler at first but less clean than a shared provider.

### Recommended choice

Use Option A.

Reason:

- preserves legacy CSV mode
- minimal code risk
- easier to add UI mode switch
- ensures all downstream logic remains unchanged

---

## 13) Recommended data-source toggle UX

Add in the Data Sources page a segment control or dropdown:

- `CSV / local dataset` (current mode)
- `Supabase / live database`

When switched to Supabase:

- the app fetches from Supabase tables instead of the local CSV directory
- the same pages continue to display asset lists, vulnerabilities, attack paths, risk summaries, optimizer candidates, and simulator results
- only the underlying source changes

This is the correct interpretation of your requirement: “switch to database connection in data sources tab, everywhere data inputs and values are derived from database directly, and then the further processes, API calling, calculations happens.”

---

## 14) Recommended execution sequence in Supabase mode

Once Supabase mode is selected, the runtime should follow this flow:

1. User selects Supabase mode in Data Sources tab
2. Frontend stores `source_mode = 'supabase'`
3. Backend reads current source mode from config or request metadata
4. The provider loads rows from `assets`, `services`, `vulnerabilities`, `controls`, etc.
5. The data is normalized into the same dictionary structures currently expected by:
   - `get_all_assets_with_risk()`
   - `get_vulnerabilities_list()`
   - `build_attack_graph()`
   - `quantify_all_scenarios()`
6. All standard API routes continue to run without UI change
7. All calculations happen from database-derived values, but the output contract remains the same

This gives you the “source mode switch” feature without rewriting the app’s risk logic.

---

## 15) Recommended table names and relationships

A good normalized design is:

- `organizations` -> one to many -> `business_units`, `assets`, `controls`, `vulnerabilities`, `threat_scenarios`
- `business_units` -> one to many -> `business_services`
- `business_services` -> one to many -> `assets`
- `assets` -> one to many -> `asset_relationships` as source and destination
- `assets` -> one to many -> `control_status`
- `controls` -> one to many -> `control_status`
- `controls` -> one to many -> `control_effectiveness`
- `threat_scenarios` -> one to many -> `control_effectiveness`
- `vulnerabilities` -> one to many -> `vulnerability_threat_rules`
- `threat_scenarios` -> one to many -> `vulnerability_threat_rules`

This preserves the semantics already used by the graph and scenario engine.

---

## 16) Practical recommendation for implementation order

To keep complexity low and safe:

1. Add the Supabase provider abstraction
2. Mirror the current CSV schema into the database
3. Build the mode switch in the Data Sources page
4. Validate that the current endpoints still return identical shapes
5. Add a `source_mode` column and a `data_source` record for each dataset
6. Add API query params or settings to override CSV mode with DB mode
7. Test using a small dataset before production migration

---

## 17) Final recommendation

The best architecture for this app is:

- keep the CSV/ingestion workflow as the current default
- add Supabase as an additional data source mode
- store the same business data that the backend already expects, but in normalized relational tables
- normalize the data before risk calculation so the quantification engine remains unchanged
- use a provider layer to unify data access across file-based and database-backed sources

This is the most maintainable design because it preserves the current project logic while enabling database-driven inputs in a clean, future-proof way.
