# System Architecture

## Overview

Seka Kama is an ecological spatial decision support system for lion conservation and landscape management in Southern Kenya and Northern Tanzania. The system combines an XGBoost predictive model, PostGIS spatial queries, and an interactive GIS web interface.

## System Topology

```
+-----------------------------------------------------------+
|                     Next.js Frontend                      |
| (MapLibre GL + deck.gl primary canvas, docked panel, a11y)|
+-----------------------------------------------------------+
                              |
                     HTTPS / JSON REST
                              |
+-----------------------------------------------------------+
|                    FastAPI Backend                        |
|  - Routers: thin HTTP handlers with response_model        |
|  - Services: domain logic, least-cost corridors, ML       |
|  - Repositories: typed SQL queries and PostGIS calls      |
|  - ML Pipeline: XGBoost model inference + sensitivity     |
+-----------------------------------------------------------+
                              |
             PostgreSQL Wire Protocol / REST API
                              |
+-----------------------------------------------------------+
|                  Supabase PostgreSQL/PostGIS              |
|  - grid_cells, occurrences, climate_annual                |
|  - cell_indicators SQL view with area calculations        |
|  - data_sources registry and sync timestamps              |
|  - contact_submissions and user feedback tables           |
+-----------------------------------------------------------+
```

## Architectural Principles

1. Data Rule: Every displayed value originates from a stored row or computation over stored rows. Request handlers read tables only.
2. Single Backend Instance: In-memory rate limiting and structured state management without distributed broker overhead.
3. Separation of Concerns: Routers define endpoints, services execute domain logic, and repositories encapsulate database interactions.
4. Primary Map Canvas: Left-aligned UI with docked 320 to 360 px side panel, 48 px icon rail, and 48 px top bar with unobstructed map view.
