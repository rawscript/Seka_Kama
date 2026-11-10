# PowerPoint Update Guide - Quick Steps

## File Location
`d:\projects\seka_kama\Seka_Kama\docs\Final year project.pptx`

## Step-by-Step Update Process

### 1. Open the Presentation
- Open `Final year project.pptx` in Microsoft PowerPoint
- Review the existing template and design

### 2. Update Slide Content
Follow the detailed content guide in `PITCH_DECK_CONTENT.md` for each slide:

| Slide # | Title | Action Required |
|---------|-------|-----------------|
| 1 | Title | Update to "Seka Kama: Ecological Digital Twin" |
| 2 | Problem | Replace with conservation challenge content |
| 3 | Solution | Introduce Seka Kama platform |
| 4 | Core Modules | Add 4-module architecture |
| 5 | Tech Stack | List backend/frontend technologies |
| 6 | Functionality | Show 6 key capabilities |
| 7 | Comparison | Add comparison table |
| 8 | Architecture | Use system diagram |
| 9 | Demo | Add screenshots (4-panel) |
| 10 | Impact | Real-world applications |
| 11 | Roadmap | Future enhancements |
| 12 | Technical | Innovation highlights |
| 13 | Challenges | Problems & solutions |
| 14 | Lessons | Key takeaways |
| 15 | Thank You | Acknowledgments & links |

### 3. Replace Images - Critical

**Find and Replace All Lion Images:**

#### For Each Slide with Lion Images:
1. Select the lion image
2. Press `Delete`
3. Insert → Pictures → Stock Images
4. Search using keywords from table below

#### Recommended Stock Images by Slide:

| Slide | Replace Lion With | Search Keywords |
|-------|-------------------|-----------------|
| 1 (Title) | Aerial landscape or GIS map | "aerial view kenya", "satellite imagery landscape", "GIS map overlay" |
| 2 (Problem) | Fragmented habitat map | "land fragmentation", "satellite before after", "habitat loss map" |
| 3 (Solution) | Dashboard screenshot or digital twin | "digital twin", "GIS dashboard", "geospatial interface" |
| 4 (Modules) | Architecture diagram | "system architecture", "microservices diagram", "data pipeline" |
| 5 (Tech Stack) | Technology icons | "technology stack", "cloud infrastructure", "code development" |
| 6 (Functionality) | Map visualization | "data visualization", "interactive map", "analytics dashboard" |
| 7 (Comparison) | Comparison chart | "competitive analysis", "comparison matrix", "feature comparison" |
| 8 (Architecture) | **Use actual diagram** | Use: https://res.cloudinary.com/dp7vwr0av/image/upload/v1778585612/Seka_Net_o4fvcf.png |
| 9 (Demo) | **Platform screenshots** | Take actual screenshots from running app |
| 10 (Impact) | Conservation + tech | "conservation technology", "team with tablets mapping", "field research tech" |
| 11 (Roadmap) | Timeline graphic | "roadmap timeline", "project phases", "growth trajectory" |
| 12 (Technical) | Code/technical | "code on screen", "api documentation", "technical excellence" |
| 13 (Challenges) | Problem-solving | "problem solving", "technical challenges", "optimization" |
| 14 (Lessons) | Learning/growth | "learning journey", "insights", "knowledge sharing" |
| 15 (Thank You) | Handshake or team | "thank you", "collaboration", "professional handshake" |

### 4. Insert Screenshots (Slide 9)

**Capture These 4 Screenshots:**

1. **Dashboard Main View**
   - Navigate to: `http://localhost:3000/dashboard`
   - Full screen capture
   - Show map with data loaded

2. **Interactive Map Close-Up**
   - Zoom into Kepler.gl map
   - Show layers panel open
   - Capture heatmap visualization

3. **Analytics Panel**
   - Open analytics sidebar
   - Show trend charts
   - Capture statistics

4. **API Documentation or Export**
   - Navigate to: `http://localhost:8000/docs`
   - Show OpenAPI interface
   - OR show data export dialog

**How to Capture:**
- Windows: Win + Shift + S (Snipping Tool)
- Save as high-quality PNG
- Crop to remove browser chrome
- Insert in PowerPoint (Insert → Pictures → This Device)

### 5. Insert System Architecture Diagram (Slide 8)

**Option A: Use Existing Diagram**
1. Download image from: https://res.cloudinary.com/dp7vwr0av/image/upload/v1778585612/Seka_Net_o4fvcf.png
2. Insert → Pictures → From File
3. Resize to fit slide
4. Add title: "System Architecture & Data Flow"

**Option B: Create New Diagram**
1. Use PowerPoint SmartArt → Process → Basic Block List
2. Add layers:
   - Data Sources (GBIF, NASA POWER, OSM)
   - Backend API (FastAPI)
   - Database (Supabase/PostGIS)
   - Frontend (Next.js)
3. Connect with arrows
4. Color-code by function

### 6. Update Text Styling

**Maintain Consistency:**
- **Heading Font**: Montserrat Bold or similar (28-36pt)
- **Body Font**: Open Sans Light or similar (16-20pt)
- **Color Scheme**: Use brand colors from guide
- **Bullets**: Use icons instead of bullet points where possible

### 7. Add Data Visualization (If Template Supports)

**For Slides with Statistics:**
- Use PowerPoint charts (Insert → Chart)
- Import data from:
  - Backend metrics
  - GBIF sync results
  - Performance benchmarks

**Example Chart Data:**

```
Lion Occurrences by Year:
2020: 287
2021: 312
2022: 295
2023: 334
2024: 247
```

### 8. Final Polish

**Before Saving:**
- [ ] Spell check (F7)
- [ ] Check all images are high-resolution
- [ ] Verify no lion images remain
- [ ] Test slide transitions
- [ ] Add slide numbers (Insert → Slide Number)
- [ ] Add your name/contact to title slide
- [ ] Review in Slide Show mode (F5)

### 9. Export Options

**Save Multiple Formats:**
1. **PowerPoint (.pptx)**: File → Save As
2. **PDF (for distribution)**: File → Export → Create PDF
3. **Video (for demo)**: File → Export → Create a Video

### 10. Presentation Mode Setup

**Before Presenting:**
1. Presenter View: Setup → Presentation Setup → Use Presenter View
2. Add speaker notes to each slide
3. Test clicker/remote if using
4. Have backup on USB drive
5. Test on presentation computer/projector

---

## Quick Image Replacement Workflow

### Using PowerPoint Stock Images:
1. Select lion image → Delete
2. Insert → Pictures → Stock Images
3. Search term from table above
4. Select image → Insert
5. Resize to fit previous image space
6. Apply design effects if needed (shadow, border)

### Using External Stock Sites:
1. Download image from:
   - Unsplash.com
   - Pexels.com  
   - Pixabay.com
2. Save to `/docs/presentation-images/` folder
3. Insert → Pictures → This Device
4. Select downloaded image

---

## Troubleshooting

### Image Quality Issues
- **Problem**: Pixelated images
- **Solution**: Use images minimum 1920x1080 resolution

### Layout Breaks
- **Problem**: Text overflow after content update
- **Solution**: Reduce font size or split content to 2 slides

### Color Mismatch
- **Problem**: New images clash with template
- **Solution**: Apply color overlay (Picture Format → Color → Recolor)

### Missing Fonts
- **Problem**: Template fonts not on your system
- **Solution**: File → Options → Save → Embed fonts in file

---

## Time Estimate

- Slide content update: 2-3 hours
- Image replacement (all slides): 1-2 hours
- Screenshot capture: 30 minutes
- Architecture diagram: 30 minutes
- Final polish & review: 1 hour

**Total: 5-7 hours**

---

## Presentation Delivery Tips

1. **Practice**: Run through 3-4 times before final presentation
2. **Timing**: 2-3 minutes per slide = 30-45 minutes total + 10-15 min Q&A
3. **Demo Prep**: Have live demo OR backup video ready
4. **Backup Plan**: PDF version on phone if tech fails
5. **Handouts**: Print PDF for panel members

---

## Contact for Help

If you need assistance with:
- Technical content accuracy
- Screenshot capturing
- Architecture diagram creation
- Data visualization

Refer back to the source documentation:
- README.md
- docs/MODEL_CARD.md
- docs/PITCH_DECK_CONTENT.md

Good luck with your presentation! 🎯

