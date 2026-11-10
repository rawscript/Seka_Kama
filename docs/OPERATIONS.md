# Operations Manual

## Deployment Architecture

Seka Kama is deployed as two decoupled components:
1. Frontend: Next.js application deployed to Vercel.
2. Backend: Containerized FastAPI service built from `backend/Dockerfile`.
3. Database: Supabase PostgreSQL instance with PostGIS extension.

## Free Tier Policies and Operational Constraints

### Supabase Free Tier Inactivity Pause
Supabase free tier projects are paused after 7 days of database inactivity.
- Symptoms: Database connection errors (`500 Internal Server Error`, `database: disconnected`).
- Remedy: Log in to the Supabase management console and unpause the project, or ensure periodic scheduled jobs keep the database active.

### GitHub Actions Cron Schedule Pause
GitHub Actions automatically pauses scheduled cron workflows on public repositories after 60 days of repository inactivity (no commits).
- Symptoms: Data synchronization jobs stop updating `data_sources` and occurrences.
- Remedy: Trigger the workflow manually from the GitHub Actions tab or commit to the repository to reset the 60-day timer.

## Scheduled Synchronization Jobs

All background synchronization jobs are located under `backend/jobs/` and executed as:

```bash
# Sync GBIF occurrences (lion and prey)
python -m jobs.sync gbif

# Sync NASA POWER climate data
python -m jobs.sync climate

# Generate model card and feature ranges
python -m jobs.evaluate
```

Jobs can be scheduled via GitHub Actions cron workflows (`.github/workflows/data_sync.yml`) or run manually via Makefile target:

```bash
make sync
```

## Monitoring and Health Checks

The backend provides two standard health probe endpoints:
- `GET /health`: Liveness probe. Returns HTTP 200 with basic process status. Does not execute outbound network calls.
- `GET /ready`: Readiness probe. Confirms database connectivity, model loading, and reports the deployed software version.
