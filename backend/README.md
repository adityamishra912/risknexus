# RiskNexus — AI-Powered Continuous Cyber Risk Quantification & Investment Optimization Backend

FastAPI + SQLAlchemy + Monte Carlo FAIR Engine + Knapsack Portfolio Optimizer + Machine Learning.

## Features
- **Continuous FAIR Loss Quantification**: Monte Carlo EAL, P90, P95, P99 loss distributions.
- **Attack Graph Engine**: NetworkX reachability graph calculation.
- **Knapsack Investment Optimizer**: Dynamic capital allocation under fixed budget constraints.
- **AI Copilot & ML Predictor**: Threat likelihood prediction and business explanation generation.

## Run Locally
```bash
python -m venv venv
venv\Scripts\activate   # On Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Data Source Modes

The default `sample` mode continues to use the checked-in CSV dataset. The additional Supabase modes load canonical tables into a private backend cache and reuse the existing CSV-compatible risk engine.

Set these Railway variables for one or both Supabase connections:

```env
SUPABASE_PRIMARY_DATABASE_URL=postgresql://...
SUPABASE_SECONDARY_DATABASE_URL=postgresql://...
DATA_SOURCE_CACHE_DIR=.data_sources
CORS_ORIGINS=https://your-frontend.vercel.app
```

Each Supabase database must expose these public tables: `assets`, `vulnerabilities`, `asset_relationships`, `business_services`, `control_status`, `risk_scenarios`, and `threat_scenarios`. The frontend activates a source with `POST /api/v1/data-sources/run` and checks availability with `GET /api/v1/data-sources/status`.

## What-If Simulation

The what-if simulation feature allows you to test hypothetical changes to the environment and see the impact on risk quantification, without persisting the changes to the underlying data.

### Endpoints

*   **`POST /api/v1/what-if/scenario`**: Simulate changes on a single scenario. Requires either `scenario_id` or `scenario_data` inline, plus a `changes` object (WhatIfChangeset).
*   **`POST /api/v1/what-if/portfolio`**: Simulate changes across the entire portfolio (or a subset by `scope_asset_ids`). Requires a `changes` object (WhatIfChangeset).

### Changeset Schema (`WhatIfChangeset`)

*   `asset_criticality` (int): 1-10
*   `internet_exposed` (bool)
*   `cvss_score` (float): 0.0-10.0
*   `known_exploited` (bool)
*   `days_open` (int)
*   `control_overrides` (List[ControlOverride]): Modify existing controls
*   `add_controls` (List[ControlOverride]): Add new controls
*   `remove_control_ids` (List[str]): Remove controls by ID
*   `downtime_cost_per_hour` (float)
*   `threat_activity` (string): low, medium, high

*Note: All simulation results are ephemeral. No state is persisted to the database.*
