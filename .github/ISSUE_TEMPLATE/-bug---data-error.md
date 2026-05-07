---
name: " Bug / Data Error"
about: Create a report to help us improve
title: Bug / Data Error
labels: ''
assignees: ''

---

## Short title (e.g., "Coordinate mismatch in Narok fencing layer")

**Type:** `bug` | `data discrepancy`

**Priority:** `high` / `medium` / `low`

### Description
What went wrong? Be specific.

### Affected component
- [ ] Data layer (specify: _________)
- [ ] Model logic (specify: _________)
- [ ] Documentation (specify: _________)

### Steps to reproduce
1. Run `validate_narok_fences.py`
2. Observe output coordinates (e.g., EPSG:32737 vs EPSG:4326)

### Expected behavior
Coordinates should match the Data Dictionary (EPSG:32737 – UTM zone 37S).

### Actual behavior
Coordinates are in geographic WGS84.

### Proposed fix
Reproject the layer before merging into the master dataset.

/cc @relevant-team-member
