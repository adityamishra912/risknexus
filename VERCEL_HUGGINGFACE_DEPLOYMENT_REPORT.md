# RiskNexus Deployment Report

## Target Architecture

- Frontend: Next.js deployed on Vercel
- Backend: FastAPI deployed inside a free Gradio Space on Hugging Face
- Database: Supabase PostgreSQL used by the backend when a Supabase data-source mode is selected
- Browser flow: Vercel frontend calls the public Hugging Face FastAPI URL through `NEXT_PUBLIC_API_URL`

```text
Browser
  |
  | HTTPS requests
  v
Vercel Next.js frontend
  |
  | NEXT_PUBLIC_API_URL
  v
Hugging Face Gradio Space
  |
  | SUPABASE_PRIMARY_DATABASE_URL / SUPABASE_SECONDARY_DATABASE_URL
  v
Supabase PostgreSQL
```

## Important Security Rules

1. Never put a Supabase database password, service-role key, or Hugging Face token in the frontend.
2. Do not commit `.env` files. Commit only `.env.example` files.
3. Add database URLs and credentials as Hugging Face Space Secrets, not as public Space variables.
4. `NEXT_PUBLIC_API_URL` is public by design. It should contain only the backend base URL.
5. Restrict CORS to the actual Vercel production domain after the first deployment. The current backend also allows Vercel preview domains through `CORS_ORIGIN_REGEX`.
6. Do not use the Supabase project REST URL (`https://project.supabase.co`) as `SUPABASE_*_DATABASE_URL`. The backend provider uses SQLAlchemy/PostgreSQL and needs a PostgreSQL connection string.

## Before Deployment

### 1. Confirm the repository structure

Vercel should use the `frontend` directory as its project root. Hugging Face should use the `backend` directory as the Gradio Space repository root, or the backend files must be copied into the Space repository root.

### 2. Confirm the backend dependency

The backend requirements include `psycopg2-binary`, which is required for PostgreSQL/Supabase connections.

### 3. Prepare the Supabase connection strings

Use a Supabase PostgreSQL connection string from Supabase Dashboard > Connect. Prefer the pooler connection for hosted deployments when recommended by Supabase.

The format is similar to:

```env
postgresql://postgres.<project-ref>:<password>@<pooler-host>:6543/postgres
```

Use the actual host, port, username, and password supplied by Supabase. URL-encode special characters in the password.

### 4. Confirm canonical tables

The Supabase database used by the provider must contain these tables:

- `assets`
- `vulnerabilities`
- `asset_relationships`
- `business_services`
- `control_status`
- `risk_scenarios`
- `threat_scenarios`

The GLPI migration script currently creates `glpi_*` tables. Those tables are not automatically equivalent to the RiskNexus canonical tables. Complete the mapping/import into the canonical schema before selecting a Supabase mode.

## Deploy the Backend to Hugging Face Using Gradio

Static Spaces cannot run this backend because they only serve frontend files. Use a free Gradio Space as the Python runtime. The existing FastAPI application remains the real backend, and Gradio provides a small health/status page at `/gradio`.

### Step 1: Create the Space

1. Open Hugging Face and select **New Space**.
2. Choose an owner and a unique Space name.
3. Set visibility according to the sensitivity of the project. Private is recommended for an internal risk platform.
4. Select **Gradio** as the SDK.
5. Select the free CPU hardware option.

### Step 2: Put the backend in the Space

The Gradio Space must contain:

```text
app.py
requirements.txt
app/
data/
ml/
threat_model.joblib
```

The repository now includes [backend/app.py](backend/app.py). It mounts the existing FastAPI application and starts Uvicorn on `0.0.0.0:${PORT:-7860}`. The `/gradio` page is only a health/status surface; Vercel should use the FastAPI API routes, not the Gradio interface.

When creating the Space from the backend directory, upload or sync the contents of `backend/` so `app.py` and the `app/` Python package are at the Space root. Do not rely on [backend/Dockerfile](backend/Dockerfile) for this deployment.

### Step 3: Add Hugging Face Secrets and Variables

In Space Settings, add these as Secrets or Variables:

```env
PROJECT_NAME=RiskNexus Risk Intelligence Engine
VERSION=1.0.0
ENVIRONMENT=production
API_V1_STR=/api/v1
SECRET_KEY=<long-random-production-secret>
DATABASE_URL=sqlite:///./risknexus.db
ACTIVE_DATASET=Dataset1
DATA_SOURCE_CACHE_DIR=.data_sources
SUPABASE_PRIMARY_DATABASE_URL=<primary-postgresql-connection-string>
SUPABASE_SECONDARY_DATABASE_URL=<secondary-postgresql-connection-string>
CORS_ORIGINS=https://your-project.vercel.app
CORS_ORIGIN_REGEX=https://.*\\.vercel\\.app
```

Use Secrets for `SECRET_KEY` and both Supabase database URLs. Use Variables for non-sensitive values such as `PROJECT_NAME`, `ENVIRONMENT`, and `CORS_ORIGINS`.

The current sample mode does not require a Supabase URL. It uses the checked-in dataset and should work even when the Supabase URLs are empty.

### Step 4: Wait for the Space build

After the Space builds, open these URLs in a browser:

```text
https://<space-owner>-<space-name>.hf.space/gradio
https://<space-owner>-<space-name>.hf.space/docs
```

The exact hostname is shown by Hugging Face in the Space page. The Gradio page should load, the root endpoint should return the RiskNexus API message, and `/docs` should show the FastAPI documentation.

### Step 5: Test the API directly

Replace the hostname below with the actual Space URL:

```powershell
$backend = "https://<space-owner>-<space-name>.hf.space"
Invoke-RestMethod "$backend/"
Invoke-RestMethod "$backend/api/v1/risk"
Invoke-RestMethod "$backend/api/v1/data-sources/status"
```

The risk endpoint should return JSON. A cold Space may take time to wake up; retry after the Space reports that it is running.

## Deploy the Frontend to Vercel

### Step 1: Import the repository

1. Open Vercel and choose **Add New > Project**.
2. Import the Git repository containing RiskNexus.
3. Set the project root directory to `frontend`.
4. Keep the framework preset as Next.js.
5. Use the existing build command: `npm run build`.
6. Use the existing output configuration. Next.js should use its default output.

### Step 2: Add the Vercel environment variable

In Vercel Project Settings > Environment Variables, add:

```env
NEXT_PUBLIC_API_URL=https://<space-owner>-<space-name>.hf.space/api/v1
```

Add it for Production, Preview, and Development as appropriate. For local development, use:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Redeploy after changing an environment variable. `NEXT_PUBLIC_*` values are embedded into the frontend build, so changing them does not affect an already-built deployment until a new deployment is created.

### Step 3: Deploy and identify the final URL

After Vercel deploys, record the production URL, for example:

```text
https://risknexus.vercel.app
```

Add that exact URL to the Hugging Face `CORS_ORIGINS` variable and restart/rebuild the Space.

## End-to-End Verification

### 1. Verify frontend configuration

Open the Vercel application and inspect the browser Network tab. API requests should go to:

```text
https://<space-owner>-<space-name>.hf.space/api/v1/...
```

They must not go to `localhost` in the production deployment.

### 2. Verify CORS preflight

From PowerShell, replace the URLs:

```powershell
$backend = "https://<space-owner>-<space-name>.hf.space"
$origin = "https://your-project.vercel.app"

curl.exe -i -X OPTIONS "$backend/api/v1/risk" `
  -H "Origin: $origin" `
  -H "Access-Control-Request-Method: GET" `
  -H "Access-Control-Request-Headers: content-type"
```

The response should be `200 OK` and include:

```text
access-control-allow-origin: https://your-project.vercel.app
```

### 3. Verify normal mode

On the Data Sources page:

1. Select **Normal Sample Mode**.
2. Click **Run Selected Source**.
3. Confirm that the request to `/api/v1/data-sources/run` succeeds.
4. Open Dashboard, Risk, Assets, Attack Paths, and Simulator.
5. Confirm their API requests return successful responses.

### 4. Verify Supabase mode

Only after the canonical tables are present:

1. Select **Supabase Connection Mode**.
2. Click **Run Selected Source**.
3. Confirm `/api/v1/data-sources/run` returns success.
4. Confirm `/api/v1/data-sources/status` reports the mode as `ready`.
5. Reload Dashboard and Risk pages.
6. Confirm the returned assets, vulnerabilities, graph, and risk values are from the selected Supabase dataset.

## Common Problems

### Browser reports Failed to fetch

Check these in order:

1. The Hugging Face Space is running and not still building or sleeping.
2. `NEXT_PUBLIC_API_URL` points to the Hugging Face URL and ends with `/api/v1`.
3. The frontend was redeployed after changing `NEXT_PUBLIC_API_URL`.
4. `CORS_ORIGINS` contains the exact Vercel production URL.
5. The backend logs show a successful `OPTIONS` request rather than `400 Bad Request`.

### OPTIONS returns 400

This is a CORS configuration problem. Ensure `CORS_ORIGINS` is either:

```env
CORS_ORIGINS=https://your-project.vercel.app
```

or a valid comma-separated list:

```env
CORS_ORIGINS=http://localhost:3000,https://your-project.vercel.app
```

Restart the backend after changing it.

### API returns 502 when selecting Supabase mode

Check:

- The Supabase URL is a PostgreSQL connection string, not a REST URL.
- The database password is correct and URL-encoded.
- The Hugging Face Space can reach the Supabase database.
- The canonical tables exist with the expected names.
- The database allows the selected connection method and port.

### API is slow after Space startup

The backend prewarms the risk engine and Monte Carlo calculations at startup. The first request can be slower. CPU-only Hugging Face hardware may also be insufficient for large datasets; scale the Space or optimize the workload if response times are unacceptable.

### Data disappears after a Space restart

The `.data_sources` materialized cache is local container storage. It may not be durable across rebuilds or restarts. The source of truth should remain Supabase. Run the selected Supabase mode again after a restart.

### Scikit-learn version warning

The warning about a model trained with one scikit-learn version and loaded by another is separate from deployment connectivity. Pin the training and inference scikit-learn versions to the same version and retrain/export the model if prediction compatibility is important.

## Recommended Deployment Order

1. Validate normal mode locally with frontend and backend running.
2. Create the Hugging Face Gradio Space.
3. Deploy the backend and verify `/docs` and `/api/v1/risk` directly.
4. Deploy the frontend to Vercel with `NEXT_PUBLIC_API_URL` pointing to Hugging Face.
5. Add the exact Vercel production URL to backend CORS settings.
6. Redeploy/restart the Hugging Face Space.
7. Verify all normal-mode pages from Vercel.
8. Configure canonical Supabase tables and credentials.
9. Test primary and secondary Supabase modes one at a time.
10. Restrict CORS to known production and preview domains when the deployment URLs are finalized.

## Final Environment Checklist

### Vercel

```env
NEXT_PUBLIC_API_URL=https://<space-owner>-<space-name>.hf.space/api/v1
```

### Hugging Face Secrets

```env
SECRET_KEY=<production-secret>
SUPABASE_PRIMARY_DATABASE_URL=<postgresql-connection-string>
SUPABASE_SECONDARY_DATABASE_URL=<postgresql-connection-string>
```

### Hugging Face Variables

```env
PROJECT_NAME=RiskNexus Risk Intelligence Engine
VERSION=1.0.0
ENVIRONMENT=production
API_V1_STR=/api/v1
DATABASE_URL=sqlite:///./risknexus.db
ACTIVE_DATASET=Dataset1
DATA_SOURCE_CACHE_DIR=.data_sources
CORS_ORIGINS=https://your-project.vercel.app
CORS_ORIGIN_REGEX=https://.*\\.vercel\\.app
```
