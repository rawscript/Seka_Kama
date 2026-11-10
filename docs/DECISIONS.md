# Architectural Decisions

## ADR 001: Backend Hosting and Execution Runtime

### Context
Seka Kama relies on Python scientific packages including `numpy`, `scipy`, `scikit-learn`, `xgboost-cpu`, and `shapely`. When deployed in a serverless environment (such as Vercel Python Serverless Functions), the uncompressed package bundle exceeds Vercel's hard 250 MB limit, causing deployment failures and 15 to 30 second cold starts.

### Decision
Deploy the backend as a containerized service (Dockerfile) on a free container host (e.g. Render Free Tier / Hugging Face Spaces / self-hosted container runtime). Vercel is retained strictly for the Next.js static and edge frontend.

### Limits and Memory Verification
- Package disk footprint (scipy + scikit-learn + xgboost + numpy + shapely): ~290 MB.
- Idle memory footprint of FastAPI + loaded XGBoost model + scaler: ~165 MB.
- Peak memory under batch inference (81 to 10,000 cells): ~220 MB.
- Free tier limit (Render): 512 MB RAM, container disk > 5 GB.
- Free tier limit (Hugging Face Spaces): 16 GB RAM, 2 vCPUs.
Both container environments comfortably accommodate the runtime package and memory requirements without hitting serverless zip/unzip limits.

## ADR 002: Single Entrypoint and Application Factory

### Context
Duplicate entry points (`backend/main.py` and `backend/api/main.py`) existed with diverging CORS middleware and eager database connections at import time, preventing unit tests from importing the app without live network access.

### Decision
Standardize on a single entrypoint: `backend/main.py` with an explicit `create_app()` factory function and an instantiated `app` object. Remove `backend/api/main.py` and point `app.py` and `vercel.json` directly to `main.py`.

## ADR 003: Authentication and Session Tokens

### Context
User authentication is managed via Supabase Auth with JWT bearer tokens.

### Decision
Client stores JWT access tokens in session storage for authenticated workflows (scenarios, feedback, exports), while public explorer routes remain unauthenticated read-only. Content Security Policy (CSP) headers are strictly enforced to mitigate cross-site scripting risks without introducing complex cookie-rewriting middleware on the single-instance backend.

## ADR 004: Simplification of Infrastructure

### Context
Previous configurations included Redis, Prometheus, Grafana, nginx, and separate dev/prod compose configurations that introduced unnecessary complexity and exposed default passwords.

### Decision
Eliminate Redis, Prometheus, Grafana, and nginx. Rate limiting is maintained in-memory on the single backend instance. A single `docker-compose.yml` boots the backend and frontend against Supabase.
