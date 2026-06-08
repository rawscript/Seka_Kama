# Seka Kama User Guide

## Overview
Seka Kama is an ecological digital twin platform for monitoring and predicting lion population dynamics in the Greater Mara ecosystem. This guide helps you get started with using the platform effectively.

## Quick Start

### 1. Access the Platform
- **Web Application**: Visit [https://seka-kama.vercel.app](https://seka-kama.vercel.app)
- **API Documentation**: [https://api.seka-kama.io/docs](https://api.seka-kama.io/docs)
- **Demo Access**: Use demo credentials for trial access

### 2. First-Time Setup
1. Create an account or sign in with existing credentials
2. Complete the interactive onboarding tutorial
3. Configure your notification preferences
4. Set up your default map view and unit preferences

## Core Features

### Interactive Map
The map interface provides spatial visualization of ecological data:

#### Map Controls
| Control | Function |
|---------|----------|
| **Zoom** | Mouse wheel or +/- buttons |
| **Pan** | Click and drag |
| **Layer Toggle** | Switch between satellite and topographic views |
| **Conservancy Selection** | Click conservancy buttons for quick navigation |
| **Time Slider** | Adjust to view historical data (2020-2026) |

#### Data Layers
- **Lion Density**: Heatmap showing lion population distribution
- **Protected Areas**: Green overlay showing conservation areas
- **Human Encroachment**: Red overlay showing nightlight intensity
- **Biological Corridors**: Purple lines showing animal movement pathways
- **Scenario Results**: Orange highlights showing simulation outcomes

### Analyst Panel
The AI-powered analyst provides ecological insights:

#### Key Information
- **Habitat Suitability**: Current conditions for lion populations
- **Threat Detection**: Real-time monitoring of human-wildlife conflict risks
- **Conservation Recommendations**: Actionable insights for habitat protection
- **Model Confidence**: Accuracy metrics for predictions

#### How to Use
1. Keep the panel expanded for continuous monitoring
2. Click "Generate Full Report" for detailed analysis
3. Use the collapse/expand toggle to manage screen space
4. Review AI-generated narratives for ecological trends

### Scenario Simulation
Test "what-if" scenarios to understand conservation impacts:

#### Running a Scenario
1. **Select Area**: Click on the map to select grid cells
2. **Define Changes**: Modify ecological parameters (rainfall, vegetation, human activity)
3. **Set Timeframe**: Choose simulation duration (1-50 years)
4. **Run Simulation**: Click "Run Scenario" to generate predictions
5. **Review Results**: Analyze population projections and risk assessments

#### Scenario Types
| Type | Purpose | Example |
|------|---------|---------|
| **Habitat Restoration** | Evaluate reforestation impact | +20% vegetation cover |
| **Infrastructure Impact** | Assess road/building effects | New settlement area |
| **Climate Change** | Model temperature/precipitation changes | -15% annual rainfall |
| **Conservation Policy** | Test protection strategies | Expand protected area |

## User Roles & Permissions

### Basic User
- View public data and maps
- Run basic scenario simulations
- Access AI-generated insights
- Export basic reports

### Researcher
- All Basic User features
- Access to raw data downloads
- Advanced scenario modeling
- Custom analysis tools
- API access for integration

### Administrator
- All Researcher features
- User management
- Data import/export
- System configuration
- Access to audit logs

## Data Management

### Data Sources
Seka Kama integrates data from multiple sources:

1. **Satellite Imagery**: NASA Landsat, Sentinel-2
2. **Climate Data**: CHIRPS rainfall, NASA POWER
3. **Biodiversity Data**: GBIF species occurrences
4. **Human Activity**: Nightlight data, population density
5. **Protected Areas**: WDPA database

### Data Refresh Schedule
- **Real-time**: Ecological alerts and threat detection
- **Daily**: Satellite and climate data
- **Weekly**: Biodiversity and protected area updates
- **Monthly**: Comprehensive data validation and quality checks

### Data Export
Export data in multiple formats:
- **GeoJSON**: For GIS applications
- **CSV/Excel**: For statistical analysis
- **PDF**: For reports and presentations
- **PNG/SVG**: For visualizations and publications

## Best Practices

### For Conservation Planning
1. **Start with Baseline**: Review current ecological conditions before planning interventions
2. **Test Multiple Scenarios**: Run various what-if analyses to understand trade-offs
3. **Focus on Corridors**: Prioritize biological corridor protection for population connectivity
4. **Monitor Continuously**: Use real-time alerts to respond to emerging threats

### For Research
1. **Use API Access**: Automate data collection and analysis
2. **Validate Models**: Compare predictions with ground truth data
3. **Collaborate**: Share scenarios and insights with research partners
4. **Document Methodology**: Record simulation parameters for reproducibility

### For Education
1. **Use Demo Mode**: Explore platform features without affecting live data
2. **Create Lesson Plans**: Develop scenarios for classroom discussions
3. **Focus on Visualization**: Use maps and charts to illustrate ecological concepts
4. **Encourage Exploration**: Allow students to test their own conservation hypotheses

## Troubleshooting

### Common Issues

#### Map Not Loading
1. Check internet connection
2. Clear browser cache
3. Try a different browser (Chrome, Firefox recommended)
4. Disable ad blockers temporarily

#### Slow Performance
1. Reduce number of active layers
2. Zoom to a smaller area
3. Clear browser cache
4. Use desktop application for intensive analysis

#### Scenario Errors
1. Check parameter values are within valid ranges
2. Ensure selected area contains sufficient data
3. Verify you have necessary permissions for simulation type
4. Contact support if error persists

#### Data Accuracy Concerns
1. Check data timestamp in the year badge
2. Verify data source information in layer details
3. Report discrepancies through the feedback system
4. Use the data quality indicators in reports

### Getting Help

#### Support Channels
- **In-App Help**: Click the "?" icon in the top-right corner
- **Email Support**: support@seka-kama.io
- **Documentation**: [https://docs.seka-kama.io](https://docs.seka-kama.io)
- **Community Forum**: [https://community.seka-kama.io](https://community.seka-kama.io)

#### Feedback & Suggestions
We value user feedback to improve the platform:
1. Use the in-app feedback form
2. Submit feature requests through GitHub Issues
3. Participate in user testing sessions
4. Join the user community forum

## Security & Privacy

### Data Protection
- All data transmissions are encrypted (HTTPS)
- User data is stored securely with access controls
- Regular security audits and vulnerability assessments
- Compliance with data protection regulations

### User Privacy
- Personal information is never shared without consent
- Option to use anonymous accounts for research
- Clear data usage policies and terms of service
- Ability to delete account and associated data

### System Security
- Multi-factor authentication available
- Role-based access control
- Audit logging of all user actions
- Regular security updates and patches

## Advanced Features

### API Integration
Access data programmatically through our REST API:

```python
import requests

# Get baseline data
response = requests.get(
    "https://api.seka-kama.io/api/baseline",
    params={"management_unit": "Mara North", "year": 2024}
)

# Run scenario
scenario_data = {
    "geometry": {"type": "Polygon", "coordinates": [...]},
    "feature_modifications": {"rainfall_mm": -15, "vegetation_cover": 20},
    "simulation_years": 10
}

response = requests.post(
    "https://api.seka-kama.io/api/scenarios",
    json=scenario_data,
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)
```

### Custom Analysis
- Upload custom data layers for analysis
- Create bespoke scenario templates
- Develop custom visualization dashboards
- Integrate with other ecological models

### Collaboration Tools
- Share scenarios with team members
- Comment on analysis results
- Create collaborative projects
- Track changes and revisions

## Updates & Roadmap

### Recent Updates
- **Version 2.0.0** (Current): Enhanced AI insights, improved performance
- **Version 1.5.0**: Added real-time monitoring, mobile optimization
- **Version 1.0.0**: Initial release with core features

### Upcoming Features
- Mobile application for field data collection
- Advanced machine learning models
- Integration with camera trap networks
- Multi-species ecological modeling
- Climate change adaptation scenarios

## Contact Information

### Technical Support
- Email: support@seka-kama.io
- Hours: Monday-Friday, 9am-5pm EAT
- Response Time: Within 24 hours

### Data Inquiries
- Email: data@seka-kama.io
- For data partnerships and collaborations

### Development Team
- GitHub: [https://github.com/rawscript/Seka_Kama](https://github.com/rawscript/Seka_Kama)
- Issues: [https://github.com/rawscript/Seka_Kama/issues](https://github.com/rawscript/Seka_Kama/issues)

---

*Seka Kama: Empowering conservation through data-driven insights.*
*Last Updated: June 2026*