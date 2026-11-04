# Seka Kama.

*An open-source research initiative investigating the spatial relationship between human expansion and apex predator viability. The apex predictors in question is East African Lion*

## Quick Links

- 🦁 **[Lion Population Data Setup](#5-lion-population-data-gbif-integration)** - Sync real GBIF occurrence data
- 📚 **[Documentation](#3-documentation-and-resources)** - Technical guides and references
- 🔧 **[Model Status](#2-vision)** - Current limitations and requirements
- 🗺️ **[Visual Guide](#4-visual-guide)** - System architecture diagram

---

## 1. Challenge
![Logo](https://res.cloudinary.com/dp7vwr0av/image/upload/v1778346341/Seka_Kama_qxf0dm.png)

The ecosystem is undergoing rapid transition. As human footprints expand through increased settlement, infrastructure, and agriculture, available habitat for wide‑ranging species becomes increasingly fragmented.

This project addresses the critical gap between land‑use planning and wildlife conservation. Currently, it is difficult to quantify how a specific change in land utility , a new barrier or conversion of wild land to seasonal farming—affects the long‑term survival of lion populations.

### Opportunity 

SekaKama is a research interface for exploring spatial data related to human development and wildlife conservation. The legacy scenario feature is currently disabled while model provenance and data units are verified; it does not currently provide validated forecasts of population change.

## 2. Vision

> **Model status (2026-10-27):** The checked-in legacy XGBoost artifact has no verified target unit, training data, feature ranges, or habitat inputs. Scenario simulation is therefore disabled in the API pending the data and provenance listed in [docs/OPEN_ITEMS.md](docs/OPEN_ITEMS.md). The model must not be interpreted as a validated count of lions or as a causal forecast. See [docs/MODEL_CARD.md](docs/MODEL_CARD.md) and [docs/data_dictionary.md](docs/data_dictionary.md).

The repository contains a legacy XGBoost model and spatial analysis interface. Its training target, units, and validation are not documented well enough to support population viability forecasts. See the model status note above and [docs/MODEL_CARD.md](docs/MODEL_CARD.md).

Scenario simulation remains disabled until the documented data and model requirements are met.

## 3. Documentation and Resources

### Repository Documentation

| Document | Purpose |
|----------|---------|
| [docs/AUDIT.md](docs/AUDIT.md) | Repository audit findings covering model provenance, database configuration, and production readiness |
| [docs/OPEN_ITEMS.md](docs/OPEN_ITEMS.md) | Blocking items requiring user input (training data, source licenses, validation evidence) |
| [docs/MODEL_CARD.md](docs/MODEL_CARD.md) | Model artifact inventory, input features, and HWC risk score formula |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Change log for specification tasks and feature status |
| [docs/SECURITY.md](docs/SECURITY.md) | Security policy and vulnerability reporting procedures |
| [docs/CODE_OF_CONDUCT.md](docs/CODE_OF_CONDUCT.md) | Contributor code of conduct and data responsibilities |

### Phase 1 Audit Reports

| Report | Purpose |
|--------|---------|
| [docs/api_consistency_audit.md](docs/api_consistency_audit.md) | API route consistency, response schemas, error handling, and input validation audit |
| [docs/frontend_visual_audit.md](docs/frontend_visual_audit.md) | Frontend visual consistency audit covering colors, spacing, and layout patterns |
| [docs/mock_behavior_inventory.md](docs/mock_behavior_inventory.md) | Inventory of mock behaviors, placeholders, and disabled features requiring implementation |

### External Resources

The following documents provide the foundational logic, raw data parameters, and research methodology:

| Document | Purpose |
|----------|---------|
| **Project Specification Sheet (Spec Sheet)** – [[Link](https://1drv.ms/w/c/8673414c20162375/IQAveIbgZRkMQ5kBnRXftheBAS1GxRJlstWqH1IVrA1RS_4?e=OkJne8)] | Technical blueprint: functional requirements, data resolution, and variables (land‑use types, infrastructure density). |
| **Project Methodology and Scope** – [/methodology] | Ecological framework: study area boundaries and scientific principles linking human expansion to habitat fragmentation. |
| **Data Dictionary and Schema** – [[Link](https://drive.google.com/drive/folders/1dIr8iG8XcJspU67zzoNSh3j1RzqcibK3?usp=sharing)] | Translation layer: every field, unit, and coordinate system to ensure consistent measurements and naming. |
| **Statistical Framework** – [[Link](https://www.kaggle.com/code/jameskariukimwaura/seka-net-ensemble)] | Mathematical brain: statistical models and algorithms for predictive outcomes and “what‑if” scenarios. |
| **Project Report** – [[Link](https://www.overleaf.com/read/jgwcjwfbwxgk#09fc88)] | Evidence and results: formal record of findings, observed trends, and data‑backed recommendations. |

## 4. Visual Guide

The diagram below illustrates the logic flow from raw data to predictive simulations:
![logic](https://res.cloudinary.com/dp7vwr0av/image/upload/v1778585612/Seka_Net_o4fvcf.png)

## 5. Lion Population Data (GBIF Integration)

**Status**: ✅ Integrated | **Data Source**: GBIF API | **Years Available**: 2015-2024

### Table of Contents
- [Quick Start](#quick-start-sync-real-lion-occurrence-data)
- [Sync Commands Reference](#sync-script-commands-reference)
- [Advanced Options](#advanced-options)
- [Maintenance & Monitoring](#maintenance--monitoring)
- [Troubleshooting](#troubleshooting)
- [Database Migration](#database-migration-required)
- [Verification](#verify-data-loaded)

---

### Quick Start: Sync Real Lion Occurrence Data

The platform integrates real lion occurrence data from GBIF (Global Biodiversity Information Facility). After running the database migration, sync historical data:

```bash
cd backend

# Full sync (all years 2020-2024) - Recommended
python scripts/sync_gbif_lions.py --start-year 2020 --end-year 2024

# Single year (faster test)
python scripts/sync_gbif_lions.py --year 2023

# Check sync status
python scripts/sync_gbif_lions.py --status
```

**Expected Duration**: 3-5 minutes for full sync (5 years)

**Expected Output**: 1,000-1,500 lion occurrences across 400-600 grid cells

### Sync Script Commands Reference

#### Basic Commands

```bash
# Sync specific year range
python scripts/sync_gbif_lions.py --start-year 2020 --end-year 2024

# Sync single year
python scripts/sync_gbif_lions.py --year 2023

# Check current sync status (which years have data)
python scripts/sync_gbif_lions.py --status
```

#### Advanced Options

```bash
# Force refresh (skip cache, re-fetch from GBIF)
python scripts/sync_gbif_lions.py --year 2023 --force-refresh

# Re-aggregate only (don't fetch from GBIF, use existing data)
python scripts/sync_gbif_lions.py --aggregate-only --start-year 2020 --end-year 2024

# Clear cache before syncing
python scripts/sync_gbif_lions.py --clear-cache --year 2023
```

#### Maintenance & Monitoring

```bash
# View sync logs
cat backend/logs/gbif_sync.log

# Test API endpoint after sync
curl "http://localhost:8000/api/lion-population?year=2023"

# Test statistics endpoint with year parameter
curl "http://localhost:8000/api/statistics?year=2023"
```

### Weekly Auto-Update (Cron)

Add to crontab for automatic weekly updates of current year data:

```bash
# Sunday 2 AM - sync current year
0 2 * * 0 cd /path/to/backend && python scripts/sync_gbif_lions.py --year 2024 >> logs/weekly_sync.log 2>&1
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: httpx` | Run `pip install httpx` |
| `SUPABASE_URL must be set` | Check `.env` file has Supabase credentials |
| GBIF API timeout | Normal for slow API - script has retries, just wait |
| Dashboard still shows 0 lions | Run `--status` to verify data synced, restart backend |
| Rate limit error (429) | Wait 5 minutes, script has exponential backoff |

### Database Migration Required

Before first sync, run the migration to create required tables:

```sql
-- Run in Supabase SQL Editor
backend/sql/migrations/001_add_lion_temporal_tables.sql
```

This creates:
- `lion_occurrences` - Raw GBIF occurrence records
- `grid_cell_lion_counts` - Aggregated counts per grid cell per year
- PostGIS spatial aggregation function
- Performance indexes

### Verify Data Loaded

After sync, check database:

```sql
-- Check occurrences by year
SELECT year, COUNT(*) as occurrences
FROM lion_occurrences
GROUP BY year
ORDER BY year DESC;

-- Check aggregated counts
SELECT year, SUM(occurrence_count) as total, COUNT(*) as cells
FROM grid_cell_lion_counts
GROUP BY year
ORDER BY year DESC;
```

### Documentation

- **Quick Start Guide**: `GBIF_QUICKSTART.md` (5-step deployment)
- **Full API Documentation**: `backend/services/README_GBIF.md`
- **Technical Design**: `.agents/tasks/lion-gbif/design.md`

### Data Source

**GBIF**: Global Biodiversity Information Facility (https://www.gbif.org/)  
**Species**: *Panthera leo* (African Lion)  
**Geographic Scope**: Kenya (country code: KE)  
**Temporal Range**: 2015-2024  
**License**: Data from GBIF.org under CC0 1.0 Universal

---

## 6. Technical Foundation & Impact

Seka Kama is a research interface for spatial conservation data. The checked-in predictive model lacks verified training provenance and validation; it should not be used to claim validated forecasts.

### Scientific Core

- **Spatial Synthesis** – Precision mapping of human activity layers and habitat fragmentation across the Greater Mara.
- **Legacy model artifact** – An XGBoost bundle is present, but multi-year population viability forecasting is not validated and scenario execution is disabled.
- **Ecological Intelligence** – Data-driven insights into predator movement patterns and biological corridors.

### Roadmap  
- **Issue tracker**: [[Link](https://github.com/rawscript/Seka_Kama/issues?q=is%3Aissue+is%3Aopen)]

*Seka Kama provides the intelligence needed to protect critical ecosystems while supporting informed regional development.*
