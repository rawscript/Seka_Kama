---
title: Seka Kama Ecological Digital Twin
emoji: 🦁
colorFrom: yellow
colorTo: red
sdk: docker
pinned: false
license: mit
---

# Seka Kama: Ecological Digital Twin

**AI-powered lion habitat prediction and conservation planning for Maasai Mara, Kenya**

This Hugging Face Space provides a demonstration interface for the Seka Kama platform,
which uses machine learning to predict lion population density and simulate conservation scenarios.

## Features

- **Baseline Predictions**: View current lion density estimates across conservancies
- **Scenario Simulation**: Run what-if analysis for development or conservation interventions
- **Feature Importance**: Understand which environmental factors drive predictions
- **Ecological Validation**: Automatic detection of ecologically implausible predictions

## Technology

- **ML Model**: XGBoost trained on nightlight satellite imagery (VIIRS)
- **Model Storage**: Hugging Face Hub (Jasekm2/sekanet-models) - auto-downloaded on startup
- **Environmental Data**: NASA POWER (climate), GBIF (wildlife occurrences)
- **Backend**: FastAPI + Python
- **Database**: Supabase (PostGIS spatial database)
- **LLM**: NVIDIA NIM API for natural language scenario analysis

Models are automatically downloaded from Hugging Face Hub on startup, eliminating the need
to include large model files in the Space repository.

## Data Sources

1. **VIIRS Nightlight**: Monthly composites (2012-2024) for human activity patterns
2. **NASA POWER**: Climate data (temperature, precipitation)
3. **GBIF**: Wildlife occurrence records (prey species density proxy)
4. **WDPA**: Protected areas boundaries
5. **Historical Surveys**: Lion population baseline from conservation organizations

## Usage

### Baseline Predictions

1. Go to "Baseline Predictions" tab
2. Click "Load Baseline Summary"
3. View total lion estimates and per-conservancy breakdown

### Scenario Simulation

1. Go to "Scenario Simulation" tab
2. Describe your scenario (e.g., "Build an eco-lodge" or "Expand protected area")
3. Adjust feature sliders:
   - **Nightlight**: Development impact (-50% to +50%)
   - **Population**: Human density change
   - **Protected Distance**: Proximity to reserves
4. Click "Run Simulation"
5. Review predicted impact on lion populations

### Example Scenarios

**Conservation Expansion**:
```
Description: "Establish new wildlife corridor connecting two reserves"
Nightlight: -20%
Population: -10%
Protected Distance: -30%
Expected: Lion population increase
```

**Development Impact**:
```
Description: "Build luxury hotel with outdoor lighting"
Nightlight: +30%
Population: +15%
Protected Distance: 0%
Expected: Lion population decrease (with plausibility warning if model predicts increase)
```

## Limitations

1. **Demo Mode**: This space uses a predefined Maasai Mara region. For custom polygon drawing, use the full web app.
2. **Model Uncertainty**: Predictions have ±15% uncertainty margin
3. **Training Period**: Model trained on 2015-2023 data
4. **Ecological Validation**: System flags illogical predictions (e.g., development → lion increase)

## Full Web Application

For the complete interactive mapping experience with:
- Custom polygon drawing
- Real-time Kepler.gl visualization
- Historical trends analysis
- Export capabilities

Visit: **[seka-kama.vercel.app](https://seka-kama.vercel.app)**

## Citation

If you use Seka Kama in your research, please cite:

```bibtex
@software{seka_kama_2024,
  title = {Seka Kama: Ecological Digital Twin for Lion Conservation},
  author = {Jase Mwaura},
  year = {2024},
  url = {https://huggingface.co/spaces/Jasekm2/Sekakama}
}
```

## Contributing

Contributions welcome! See the main repository for development guidelines.

## License

MIT License - See LICENSE file for details

## Acknowledgments

- **NASA POWER** for climate data API
- **GBIF** for biodiversity occurrence data
- **NVIDIA** for NIM API access
- **Maasai Mara conservancies** for field data and collaboration

---

**Built for wildlife conservation in Maasai Mara, Kenya**
