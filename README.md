# Seka Kama.

*An open-source research initiative investigating the spatial relationship between human expansion and apex predator viability. The apex predictors in question is East African Lion*

## 1. Challenge
![Logo](https://res.cloudinary.com/dp7vwr0av/image/upload/v1778346341/Seka_Kama_qxf0dm.png)

The ecosystem is undergoing rapid transition. As human footprints expand through increased settlement, infrastructure, and agriculture, available habitat for wide‑ranging species becomes increasingly fragmented.

This project addresses the critical gap between land‑use planning and wildlife conservation. Currently, it is difficult to quantify how a specific change in land utility , a new barrier or conversion of wild land to seasonal farming—affects the long‑term survival of lion populations.

### Opportunity 

SekaKama is a research interface for exploring spatial data related to human development and wildlife conservation. The legacy scenario feature is currently disabled while model provenance and data units are verified; it does not currently provide validated forecasts of population change.

## 2. Vision

> **Model status (2026-10-27):** The checked-in legacy XGBoost artifact has no verified target unit, training data, feature ranges, or habitat inputs. Scenario simulation is therefore disabled in the API pending the data and provenance listed in [OPEN_ITEMS.md](OPEN_ITEMS.md). The model must not be interpreted as a validated count of lions or as a causal forecast. See [MODEL_CARD.md](MODEL_CARD.md) and [docs/data_dictionary.md](docs/data_dictionary.md).

The repository contains a legacy XGBoost model and spatial analysis interface. Its training target, units, and validation are not documented well enough to support population viability forecasts. See the model status note above and [MODEL_CARD.md](MODEL_CARD.md).

Scenario simulation remains disabled until the documented data and model requirements are met.

## 3. Documentation and Resources

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

## 5. Technical Foundation & Impact

Seka Kama is a high-performance Digital Twin built for ecological resilience. The system integrates advanced spatial analysis with predictive modeling to provide a comprehensive decision-support environment for conservationists, researchers, and government agencies.

### Scientific Core

- **Spatial Synthesis** – Precision mapping of human activity layers and habitat fragmentation across the Greater Mara.
- **Predictive Modeling** – Statistical frameworks built on XGBoost to simulate multi-year population viability.
- **Ecological Intelligence** – Data-driven insights into predator movement patterns and biological corridors.

### Roadmap  
- **Issue tracker**: [[Link](https://github.com/rawscript/Seka_Kama/issues?q=is%3Aissue+is%3Aopen)]

*Seka Kama provides the intelligence needed to protect critical ecosystems while supporting informed regional development.*
