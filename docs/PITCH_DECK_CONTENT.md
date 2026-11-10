# Seka Kama Pitch Deck Content Guide

**Instructions:** Use this guide to update the existing PowerPoint presentation at `docs/Final year project.pptx`. Replace lion images with relevant stock images (maps, GIS visualization, conservation technology, satellite imagery, data dashboards).

---

## Slide 1: Title Slide

**Title:** Seka Kama: Ecological Digital Twin  
**Subtitle:** Spatial Intelligence for Wildlife Conservation and Land Use Planning  
**Tagline:** "Bridging Human Development and Apex Predator Viability"

**Visual Elements:**
- Background: Aerial view of Kenyan landscape (Maasai Mara region preferred) or abstract GIS map overlay
- Logo: Seka Kama logo (if available) in top right corner
- Color scheme: Earth tones with data visualization accents (gold #775a19, charcoal #1a1c1c)

**Footer:** Your Name | Final Year Project | [Year]

---

## Slide 2: The Problem

**Title:** The Conservation Challenge

**Content:**
- **Rapid Habitat Fragmentation**: Human settlements, infrastructure, and agriculture are expanding into wildlife corridors
- **Data-Driven Decision Gap**: Land-use planners lack tools to quantify wildlife impact before development
- **Population Decline**: East African lion populations at risk due to habitat loss and human-wildlife conflict

**Key Statistics Box:**
- Lion habitat declining at 3-5% annually
- Infrastructure development accelerating in Greater Mara ecosystem
- Limited tools to predict conservation outcomes

**Visual Elements:**
- Split-screen comparison: natural landscape vs developed landscape
- OR: Infographic showing habitat fragmentation timeline
- Stock images: Satellite imagery showing land-use change, fragmented habitat map

---

## Slide 3: The Solution - Seka Kama Platform

**Title:** Seka Kama: Spatial Intelligence Platform

**Content:**
**What is Seka Kama?**

A geospatial digital twin that integrates real-time ecological data, human development patterns, and predictive analytics to support evidence-based conservation planning.

**Core Value Proposition:**
- **Data Integration**: Synthesizes 43+ spatial variables (land use, infrastructure, climate, wildlife occurrences)
- **Real-Time Intelligence**: Live GBIF lion occurrence data (2015-2024)
- **Spatial Analysis**: PostGIS-powered geospatial queries and corridor mapping
- **Research Interface**: Explore spatial relationships between development and wildlife viability

**Visual Elements:**
- Platform screenshot: Dashboard showing map interface
- OR: Architecture diagram showing data flow
- Stock images: GIS software interface, data visualization dashboard, digital map

---

## Slide 4: Core Modules

**Title:** System Architecture: Core Modules

**4-Column Grid Layout:**

### 1. Data Ingestion Layer
- **GBIF API Integration**: Real lion occurrence data
- **NASA POWER API**: Climate and rainfall data
- **OpenStreetMap**: Infrastructure and settlements
- **Supabase/PostGIS**: Spatial database

### 2. Analytics Engine
- **XGBoost ML Model**: Habitat suitability scoring
- **Spatial Processing**: 1km grid cell analysis
- **HWC Risk Calculation**: Human-wildlife conflict prediction
- **Corridor Analysis**: Movement pattern identification

### 3. Backend API
- **FastAPI Framework**: RESTful endpoints
- **Authentication**: JWT-based user management
- **Rate Limiting**: Redis-backed distributed limiting
- **Error Handling**: Structured logging & monitoring

### 4. Frontend Interface
- **Interactive Mapping**: Kepler.gl visualization
- **Dashboard Analytics**: Real-time metrics
- **Scenario Explorer**: (Research mode - validation pending)
- **Export Tools**: GeoJSON, CSV data export

**Visual Elements:**
- Architecture diagram with 4 interconnected modules
- Icons for each module (database, brain/AI, server, monitor)
- Stock images: System architecture diagram, microservices illustration

---

## Slide 5: Technology Stack

**Title:** Technology Stack & Infrastructure

**Two-Column Layout:**

### Backend Technologies
- **Framework**: FastAPI (Python 3.11+)
- **Database**: Supabase (PostgreSQL + PostGIS)
- **ML/AI**: XGBoost, NumPy, Shapely
- **Caching**: Redis (distributed rate limiting)
- **APIs**: GBIF, NASA POWER, OpenAI
- **Authentication**: JWT, bcrypt, passlib
- **Deployment**: Railway (containerized)

### Frontend Technologies
- **Framework**: Next.js 16.2 (React 19.2)
- **Language**: TypeScript 5
- **Mapping**: Kepler.gl, Mapbox GL JS
- **UI**: Tailwind CSS, Radix UI
- **State**: React Query, Zustand
- **Visualization**: Recharts, D3.js
- **Deployment**: Vercel (edge functions)

**Infrastructure:**
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (error tracking)
- **Database**: Supabase (managed PostGIS)
- **Storage**: Cloudinary (assets)

**Visual Elements:**
- Tech stack logos arranged in two columns
- OR: Technology ecosystem diagram
- Stock images: Cloud infrastructure, code on screen, tech stack icons

---

## Slide 6: Key Functionality

**Title:** Platform Capabilities

**Grid Layout (2x2 or 3x2):**

### 1. Real-Time Wildlife Data
- Live GBIF lion occurrence data (1,000-1,500 records)
- Temporal analysis (2015-2024)
- Grid-based aggregation (400-600 cells)
- Automated weekly sync

### 2. Spatial Analysis
- PostGIS-powered geospatial queries
- Bounding box filtering
- Distance calculations (protected areas, settlements)
- Corridor identification

### 3. Interactive Visualization
- Multi-layer mapping (heatmaps, choropleths)
- Management unit boundaries
- Protected area overlays
- Custom data export (GeoJSON, CSV)

### 4. Predictive Analytics
- Habitat suitability scoring (43 features)
- HWC risk assessment
- Infrastructure impact analysis
- Baseline comparison tools

### 5. User Management
- Role-based access control (Admin, Analyst, Viewer)
- API key management
- Audit logging
- Session security

### 6. Data Export & Integration
- RESTful API (OpenAPI documented)
- GeoJSON feature collections
- CSV statistical exports
- Webhook integrations

**Visual Elements:**
- Screenshot collage of each feature
- Icons for each capability
- Stock images: Data dashboard, map visualization, analytics charts

---

## Slide 7: Comparison with Existing Systems

**Title:** Competitive Advantage

**Table Format:**

| Feature | Traditional GIS (QGIS/ArcGIS) | Google Earth Engine | **Seka Kama** |
|---------|-------------------------------|---------------------|---------------|
| **Wildlife-Specific** | ❌ Generic GIS | ❌ General remote sensing | ✅ Lion conservation focus |
| **Real-Time Data** | ❌ Manual updates | ⚠️ Satellite only | ✅ GBIF live integration |
| **Web-Based Access** | ❌ Desktop software | ✅ Cloud platform | ✅ Full web interface |
| **ML Predictions** | ❌ Manual analysis | ⚠️ Requires coding | ✅ Built-in model |
| **HWC Risk Scoring** | ❌ Not available | ❌ Not available | ✅ Automated calculation |
| **Multi-User Collaboration** | ⚠️ File-based | ✅ Cloud collaboration | ✅ Role-based access |
| **API Integration** | ❌ Limited | ✅ Strong | ✅ RESTful + WebSocket |
| **Open Source** | ✅ QGIS is | ⚠️ Proprietary | ✅ Fully open |
| **Cost** | $$$ (ArcGIS) | Free (limits) | Free + Self-hosted |

**Key Differentiators:**
1. **Purpose-Built**: Specifically designed for East African lion conservation
2. **Data Integration**: Combines wildlife occurrences, climate, and human development
3. **Accessibility**: No GIS expertise required for basic analysis
4. **Real-Time**: Live data updates vs. static datasets
5. **Predictive**: Machine learning for future impact assessment

**Visual Elements:**
- Comparison table with checkmarks/X marks color-coded
- OR: Venn diagram showing unique features
- Stock images: Comparison chart, competitive analysis illustration

---

## Slide 8: System Architecture Diagram

**Title:** System Architecture & Data Flow

**Visual Content:**
**[Use the existing logic flow diagram from README]**

```
┌─────────────────────┐
│   Data Sources      │
│  - GBIF API         │
│  - NASA POWER       │
│  - OpenStreetMap    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Backend API        │
│  - FastAPI          │
│  - Data Processing  │
│  - ML Model         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Database           │
│  - Supabase         │
│  - PostGIS          │
│  - Redis Cache      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Frontend           │
│  - Next.js          │
│  - Kepler.gl Maps   │
│  - Analytics UI     │
└─────────────────────┘
```

**Include:**
- Data flow arrows
- Technology labels at each layer
- Color-coded components (data, processing, storage, presentation)

**Visual Elements:**
- Use the actual diagram from: https://res.cloudinary.com/dp7vwr0av/image/upload/v1778585612/Seka_Net_o4fvcf.png
- OR: Create simplified architecture diagram with icons
- Stock images: System architecture diagram, data pipeline illustration

---

## Slide 9: Demo/Screenshots

**Title:** Platform in Action

**4-Panel Screenshot Grid:**

### Panel 1: Dashboard Overview
- Main dashboard showing map interface
- Metrics panel (total lions, active cells, management units)
- Navigation menu

### Panel 2: Interactive Map
- Kepler.gl visualization with heatmap
- Layer controls visible
- Management unit boundaries overlay

### Panel 3: Analytics Panel
- Trend charts showing temporal data
- Statistics breakdown
- Feature importance visualization

### Panel 4: Data Export
- GeoJSON export interface
- API documentation view
- OR: Admin panel showing user management

**Visual Elements:**
- Actual screenshots from running platform
- Add callout annotations highlighting key features
- Keep consistent border/frame around each screenshot

---

## Slide 10: Impact & Use Cases

**Title:** Real-World Applications

**Content:**

### Conservation Organizations
- Identify priority habitat corridors
- Monitor lion population trends
- Assess impact of proposed infrastructure

### Land-Use Planners
- Evaluate development proposals
- Minimize human-wildlife conflict zones
- Plan wildlife-compatible infrastructure

### Research Institutions
- Access integrated spatial datasets
- Conduct habitat fragmentation studies
- Validate conservation strategies

### Government Agencies
- Evidence-based policy making
- Protected area management
- Regional development planning

**Impact Metrics (Potential):**
- 400-600 grid cells analyzed
- 1,500+ lion occurrences tracked
- Multiple management units covered
- 10+ years of temporal data

**Visual Elements:**
- Icons for each user category
- Mini case study cards
- Stock images: Conservation team with technology, planning meeting with maps, research scientists

---

## Slide 11: Future Enhancements

**Title:** Roadmap & Future Development

**Timeline or List Format:**

### Phase 1: Current State (Complete)
- Real-time GBIF integration
- Spatial analysis engine
- Interactive mapping interface
- Multi-user authentication

### Phase 2: Validation (In Progress)
- Model provenance documentation
- Training data verification
- Scenario simulation validation
- Peer review process

### Phase 3: Expansion (Planned)
- Additional species coverage (elephants, cheetahs)
- WebSocket real-time updates
- Mobile application (field data collection)
- Offline mode for remote areas

### Phase 4: Collaboration (Future)
- Multi-stakeholder collaboration tools
- Shared scenario workspaces
- Public API for researchers
- Integration with national databases

**Visual Elements:**
- Timeline roadmap with milestones
- Progress bar showing current phase
- Stock images: Future technology, innovation, growth chart

---

## Slide 12: Technical Highlights

**Title:** Innovation & Technical Excellence

**Highlight Cards (3 columns):**

### Spatial Intelligence
- PostGIS for complex geospatial queries
- 1km grid cell precision
- Sub-second query performance
- 43-feature ML model

### Production-Ready
- Redis distributed rate limiting
- JWT authentication & authorization
- Structured error handling
- Comprehensive API documentation

### Research Integrity
- Model card documentation
- Data provenance tracking
- Open-source transparency
- Reproducible methodology

**Code Example Box:**
```python
# Example: Real-time lion data sync
python scripts/sync_gbif_lions.py --year 2024

# Returns: 
# ✓ 1,247 occurrences
# ✓ 523 grid cells updated
# ✓ Completed in 3m 42s
```

**Visual Elements:**
- Technical achievement badges/icons
- Code snippet with syntax highlighting
- Stock images: Clean code, technical documentation, quality assurance

---

## Slide 13: Challenges Overcome

**Title:** Technical Challenges & Solutions

**Two-Column Layout:**

### Challenge 1: Real-Time Data Integration
**Problem:** GBIF API rate limits and large dataset volumes  
**Solution:** Caching layer, exponential backoff retry logic, weekly incremental sync

### Challenge 2: Spatial Query Performance
**Problem:** Complex PostGIS queries timing out  
**Solution:** Spatial indexing (GIST), query optimization, bounding box pre-filtering

### Challenge 3: Model Transparency
**Problem:** Legacy model without documentation  
**Solution:** Comprehensive model card, disabled predictions until validation, open audit trail

### Challenge 4: Multi-User Scalability
**Problem:** In-memory rate limiting unsuitable for production  
**Solution:** Redis distributed rate limiting with fail-open degraded mode

### Challenge 5: Frontend Performance
**Problem:** Rendering 1,500+ map features  
**Solution:** Kepler.gl GPU acceleration, data clustering, lazy loading

**Visual Elements:**
- Problem/Solution pairs with icons
- Before/After performance metrics
- Stock images: Problem-solving, technical challenges, optimization

---

## Slide 14: Lessons Learned

**Title:** Key Takeaways & Insights

**Content:**

### Technical Lessons
1. **Spatial Data is Complex**: PostGIS requires deep understanding of projections, topology, and indexing
2. **API Integration is Fragile**: Always implement retries, caching, and fallback strategies
3. **Documentation Matters**: Model cards and data dictionaries are essential for reproducibility
4. **Performance vs Features**: Sometimes disabling features (scenarios) ensures integrity

### Project Management
1. **Iterative Development**: Agile sprints allowed rapid pivoting based on audit findings
2. **Testing Early**: Spatial validation caught coordinate system mismatches before deployment
3. **Open Communication**: Transparent model limitations build trust with stakeholders

### Research Ethics
1. **Validate Before Claiming**: Disabled scenarios until provenance verified
2. **Cite Data Sources**: GBIF attribution and license compliance critical
3. **Transparent Limitations**: Model card documents all unknowns

**Visual Elements:**
- Key lesson cards with icons
- Pull quotes highlighting critical insights
- Stock images: Learning, lightbulb moment, notebook

---

## Slide 15: Thank You

**Title:** Thank You

**Content:**
**Seka Kama: Bridging Conservation and Technology**

**Project Links:**
- GitHub Repository: github.com/rawscript/Seka_Kama
- Documentation: /docs
- Research Paper: Overleaf link
- Statistical Framework: Kaggle link

**Contact:**
- **Your Name**
- **Your Email**
- **LinkedIn Profile**

**Acknowledgments:**
- Project Supervisor: [Name]
- Data Sources: GBIF, NASA POWER, OpenStreetMap
- Open Source Community

**Call to Action:**
"Join us in building spatial intelligence tools for conservation"

**Visual Elements:**
- Clean, minimal layout
- QR code linking to GitHub repository
- Professional headshot (optional)
- Seka Kama logo
- Stock images: Handshake, thank you card, collaboration

---

## Design Guidelines

### Color Palette
- **Primary Gold**: #775a19
- **Dark Gold**: #4e3700
- **Charcoal**: #1a1c1c
- **Background**: #f9f9f9
- **Accent**: #c5a059
- **Success**: #10b981
- **Warning**: #f59e0b

### Typography
- **Headings**: Bold, sans-serif (e.g., Montserrat, Roboto)
- **Body**: Light, readable (e.g., Open Sans, Lato)
- **Code**: Monospace (e.g., Fira Code, Consolas)

### Stock Image Sources (Replace Lion Images)
1. **Unsplash**: Search for "GIS mapping", "satellite imagery", "data visualization", "conservation technology"
2. **Pexels**: Search for "dashboard analytics", "map interface", "technology collaboration"
3. **Pixabay**: Search for "geospatial", "cartography", "digital twin"

### Image Keywords to Use
- Satellite imagery of landscapes
- Digital maps and GIS interfaces
- Data dashboards and analytics
- Conservation technology
- Team collaboration with technology
- Infrastructure planning maps
- Climate and weather data visualization
- African landscapes (aerial/satellite view)
- Technology and nature integration

### Images to AVOID
- Direct lion photographs (replace with system screenshots or abstract representations)
- Generic business stock photos
- Overly corporate imagery
- Unrelated wildlife that distracts from the technical focus

---

## Presentation Tips

1. **Keep text minimal**: Use bullet points, not paragraphs
2. **Visualize data**: Charts > Tables > Text
3. **Consistent layout**: Use master slides for uniform appearance
4. **High-quality images**: Minimum 1920x1080 resolution
5. **Test readability**: Ensure text readable from back of room
6. **Practice timing**: Aim for 2-3 minutes per slide
7. **Prepare demos**: Have live demo or video backup ready

---

**Total Slides: 15**  
**Estimated Presentation Time: 30-40 minutes with Q&A**  
**Target Audience: Academic panel, technical reviewers, potential stakeholders**

