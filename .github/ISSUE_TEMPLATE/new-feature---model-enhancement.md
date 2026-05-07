---
name: New Feature / Model Enhancement
about: Suggest an idea for this project
title: New Feature / Model Enhancement
labels: ''
assignees: ''

---

## Short title (e.g., "Add seasonal livestock migration as a variable")

**Type:** `enhancement` | `new variable`

**Related document:** [ ] Methodology  [ ] Data Dictionary  [ ] Simulation Logic

### Problem statement
Currently the model assumes static land use, but livestock corridors change seasonally. This affects lion movement predictions.

### Proposed solution
Add a `seasonal_corridor_weight` (0–1) to the fragmentation index.

### Data source
- Satellite-derived seasonal grazing maps (NMK, 2023)
- Community transhumance routes (digitized from participatory mapping)

### Validation check
Compare baseline vs. seasonal model outputs for the Narok corridor.

### Definition of done
- [ ] Data Dictionary updated with new field
- [ ] Simulation script accepts seasonal parameter
- [ ] One test scenario run and documented
