# Seka Kama Backend

FastAPI backend for the Seka Kama conservation platform.

## Quick Commands

### Development Server
```bash
# Start development server
python -m uvicorn main:app --reload

# Start on specific port
python -m uvicorn main:app --reload --port 8001
```

### GBIF Lion Data Sync
```bash
# First time: Sync all historical data (2020-2024)
python scripts/sync_gbif_lions.py --start-year 2020 --end-year 2024

# Update current year
python scripts/sync_gbif_lions.py --year 2024

# Check status
python scripts/sync_gbif_lions.py --status
```

### Database Migrations
```bash
# Run in Supabase SQL Editor:
sql/migrations/001_add_lion_temporal_tables.sql
```

### Testing
```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_gbif_service.py -v

# Run with coverage
pytest --cov=services --cov-report=html
```

---

## Project Structure

```
backend/
├── api/
│   ├── routes.py           # Main API endpoints
│   ├── models.py           # Pydantic models
│   └── auth_routes.py      # Authentication endpoints
├── services/
│   ├── gbif_lion_service.py         # GBIF API integration ⭐
│   ├── ecological_data_service.py   # NASA POWER & ecological data
│   ├── prediction_service.py        # XGBoost predictions
│   └── spatial_service.py           # PostGIS spatial queries
├── scripts/
│   ├── sync_gbif_lions.py           # GBIF data sync script ⭐
│   └── import_grid_cells.py         # Grid cell import
├── sql/
│   └── migrations/
│       ├── 001_add_lion_temporal_tables.sql  # GBIF tables ⭐
│       └── bootstrap.sql             # Initial schema
├── tests/
│   ├── test_gbif_service.py         # GBIF tests ⭐
│   └── test_auth_routes.py          # Auth tests
├── core/
│   ├── database.py          # Supabase client
│   ├── auth.py              # JWT authentication
│   └── config.py            # Configuration
└── logs/
    └── gbif_sync.log        # Sync operation logs
```

⭐ = New GBIF integration files

---

## Environment Setup

### 1. Create Virtual Environment
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy `.env.template` to `.env` and fill in:

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET_KEY=your_secret_key
JWT_ALGORITHM=HS256

# NVIDIA NIM (optional)
NVIDIA_API_KEY=your_nvidia_key
```

### 4. Run Database Migrations
```sql
-- In Supabase SQL Editor, run:
backend/sql/bootstrap.sql
backend/sql/migrations/001_add_lion_temporal_tables.sql
```

### 5. Sync Lion Population Data
```bash
python scripts/sync_gbif_lions.py --start-year 2020 --end-year 2024
```

### 6. Start Development Server
```bash
python -m uvicorn main:app --reload
```

Server runs at: `http://localhost:8000`  
API docs: `http://localhost:8000/docs`

---

## API Endpoints

### Core Endpoints
- `GET /api/health` - Health check
- `GET /api/baseline` - Baseline lion density grid
- `GET /api/statistics?year=YYYY` - Landscape statistics (year-filtered)
- `GET /api/protected-areas` - WDPA protected areas
- `GET /api/management-units` - List of management units

### GBIF Lion Data (NEW ⭐)
- `GET /api/lion-population?year=YYYY` - Lion occurrences by year
- Supports JSON and GeoJSON formats
- Filters by management unit
- Returns occurrence counts per grid cell

### Scenario Simulation (Disabled)
- `POST /api/scenario` - Scenario simulation (currently disabled)
- See `docs/OPEN_ITEMS.md` for model validation requirements

### Ecosystem Data
- `GET /api/ecosystem/indicators` - Live ecosystem indicators (NASA, GBIF)
- `GET /api/ecosystem/environment` - Environmental conditions (NASA POWER)
- `GET /api/ecosystem/trends` - Historical trends

---

## GBIF Integration Details

### What It Does
Fetches real lion occurrence data from GBIF (Global Biodiversity Information Facility) and aggregates it to grid cells by year.

### Data Flow
```
GBIF API → lion_occurrences table → aggregation → grid_cell_lion_counts table → API endpoints
```

### Key Features
- ✅ Year-specific lion population data (2015-2024)
- ✅ Automatic caching (24-hour TTL)
- ✅ Rate limiting and retry logic
- ✅ Spatial aggregation via PostGIS
- ✅ Backward compatible with XGBoost predictions

### Sync Commands

**Full sync** (all years):
```bash
python scripts/sync_gbif_lions.py --start-year 2020 --end-year 2024
```

**Single year**:
```bash
python scripts/sync_gbif_lions.py --year 2023
```

**Force refresh** (skip cache):
```bash
python scripts/sync_gbif_lions.py --year 2023 --force-refresh
```

**Re-aggregate** (no GBIF fetch):
```bash
python scripts/sync_gbif_lions.py --aggregate-only --start-year 2020 --end-year 2024
```

**Check status**:
```bash
python scripts/sync_gbif_lions.py --status
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Dashboard shows 0 lions | Run sync script, restart backend |
| GBIF timeout | Normal, script retries automatically |
| Rate limit (429) | Wait 5 min, script has exponential backoff |
| Missing module `httpx` | `pip install httpx` |
| PostGIS function not found | Re-run `001_add_lion_temporal_tables.sql` |

### Documentation
- **API Reference**: `services/README_GBIF.md`
- **Quick Start**: `../GBIF_QUICKSTART.md`
- **Technical Design**: `../.agents/tasks/lion-gbif/design.md`

---

## Testing

### Run Tests
```bash
# All tests
pytest

# Specific test file
pytest tests/test_gbif_service.py -v

# With coverage
pytest --cov=services --cov-report=html
```

### Manual API Testing
```bash
# Test GBIF endpoint
curl "http://localhost:8000/api/lion-population?year=2023" | jq

# Test statistics with year
curl "http://localhost:8000/api/statistics?year=2023" | jq '.total_lions'
# Should return > 0 after sync

# Test GeoJSON format
curl "http://localhost:8000/api/lion-population?year=2023&format=geojson" | jq '.features | length'
```

---

## Development Guidelines

### Adding New Endpoints
1. Define Pydantic models in `api/models.py`
2. Add route handler in `api/routes.py`
3. Add service logic in `services/`
4. Write tests in `tests/`
5. Update API documentation

### Database Changes
1. Create migration SQL in `sql/migrations/`
2. Test locally first
3. Document in migration file
4. Run on production via Supabase SQL Editor

### Code Style
- Follow PEP 8
- Use type hints
- Add docstrings to functions
- Log errors with context

---

## Production Deployment

### Environment Variables
Ensure production `.env` has:
- Supabase production credentials
- Strong JWT secret
- NVIDIA API key (if using LLM features)

### Pre-deployment Checklist
- [ ] Run all migrations
- [ ] Sync GBIF data for all years
- [ ] Verify API endpoints respond correctly
- [ ] Check logs for errors
- [ ] Test authentication flow
- [ ] Verify year selector works on frontend

### Post-deployment
- [ ] Monitor logs for first 24 hours
- [ ] Verify dashboard shows non-zero lion counts
- [ ] Test year selector changes data in real-time
- [ ] Check API response times (<500ms)

---

## Support

**Documentation**: See `services/README_GBIF.md` for detailed GBIF integration docs  
**Issues**: https://github.com/rawscript/Seka_Kama/issues  
**API Docs**: http://localhost:8000/docs (when server running)

---

## License

See main repository LICENSE file.
