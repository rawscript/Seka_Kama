# GBIF Integration

## Overview

Seka Kama integrates occurrence records from the Global Biodiversity Information Facility (GBIF) Occurrence API to track verified species records across the study grid.

- Data Source: GBIF Occurrence API (https://api.gbif.org/v1/)
- Taxon Groups:
  - African Lion (*Panthera leo*, taxonKey: 5219404)
  - Ungulate Prey species
- Geographic Scope: Study area bounding box in Southern Kenya / Northern Tanzania
- Ingestion Model: Scheduled batch synchronization into Supabase PostGIS tables. Request handlers read stored tables only.

## Database Architecture

### Table: occurrences
- id: bigserial primary key
- gbif_key: bigint unique
- taxon_group: text ('lion' or 'prey')
- species: text
- year: integer
- month: integer
- event_date: date
- decimal_longitude: double precision
- decimal_latitude: double precision
- geom: geometry(Point, 4326)
- basis_of_record: text
- licence: text
- dataset_key: text
- institution_code: text
- created_at: timestamptz

### Spatial Indexes
- occurrences_geom_idx: GiST index on geom
- occurrences_year_taxon_idx: B-Tree index on (year, taxon_group)

## Synchronization Job

Synchronization is performed through the backend job runner:

```bash
python -m jobs.sync gbif --start-year 2020 --end-year 2024
```

To verify synchronization status:

```bash
python -m jobs.sync gbif --status
```

## Licence Compliance

GBIF occurrence records are licensed individually by data publishers (CC0 1.0, CC-BY 4.0, or CC-BY-NC 4.0). Every record retains its publisher-specified licence in the database and is surfaced in data attribution outputs.
