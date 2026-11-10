"""
Generate Seka Kama pitch deck PowerPoint presentation
"""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor

# Brand colors
BRAND_GOLD = RGBColor(119, 90, 25)
BRAND_DARK_GOLD = RGBColor(78, 55, 0)
BRAND_CHARCOAL = RGBColor(26, 28, 28)
BRAND_BG = RGBColor(249, 249, 249)
BRAND_ACCENT = RGBColor(197, 160, 89)

def create_presentation():
    prs = Presentation()
    prs.slide_width = Inches(10)
    prs.slide_height = Inches(7.5)
    
    # Slide 1: Title
    slide1 = prs.slides.add_slide(prs.slide_layouts[6])
    
    title = slide1.shapes.add_textbox(Inches(1), Inches(2.5), Inches(8), Inches(1))
    title_frame = title.text_frame
    title_frame.text = "Seka Kama: Ecological Digital Twin"
    title_frame.paragraphs[0].font.size = Pt(44)
    title_frame.paragraphs[0].font.bold = True
    title_frame.paragraphs[0].font.color.rgb = BRAND_CHARCOAL
    title_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    
    subtitle = slide1.shapes.add_textbox(Inches(1), Inches(3.7), Inches(8), Inches(0.5))
    subtitle_frame = subtitle.text_frame
    subtitle_frame.text = "Spatial Intelligence for Wildlife Conservation and Land Use Planning"
    subtitle_frame.paragraphs[0].font.size = Pt(20)
    subtitle_frame.paragraphs[0].font.color.rgb = BRAND_GOLD
    subtitle_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    
    tagline = slide1.shapes.add_textbox(Inches(1), Inches(4.5), Inches(8), Inches(0.5))
    tagline_frame = tagline.text_frame
    tagline_frame.text = '"Bridging Human Development and Apex Predator Viability"'
    tagline_frame.paragraphs[0].font.size = Pt(16)
    tagline_frame.paragraphs[0].font.italic = True
    tagline_frame.paragraphs[0].font.color.rgb = BRAND_DARK_GOLD
    tagline_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    
    footer = slide1.shapes.add_textbox(Inches(1), Inches(6.8), Inches(8), Inches(0.4))
    footer_frame = footer.text_frame
    footer_frame.text = "Final Year Project | 2025"
    footer_frame.paragraphs[0].font.size = Pt(12)
    footer_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    
    # Slide 2: The Problem
    slide2 = prs.slides.add_slide(prs.slide_layouts[1])
    title2 = slide2.shapes.title
    title2.text = "The Conservation Challenge"
    
    body2 = slide2.placeholders[1]
    tf2 = body2.text_frame
    tf2.text = "Rapid Habitat Fragmentation"
    
    p2 = tf2.add_paragraph()
    p2.text = "Human settlements, infrastructure, and agriculture expanding into wildlife corridors"
    p2.level = 1
    
    p3 = tf2.add_paragraph()
    p3.text = "Data-Driven Decision Gap"
    
    p4 = tf2.add_paragraph()
    p4.text = "Land-use planners lack tools to quantify wildlife impact before development"
    p4.level = 1
    
    p5 = tf2.add_paragraph()
    p5.text = "Population Decline"
    
    p6 = tf2.add_paragraph()
    p6.text = "East African lion populations at risk due to habitat loss and human-wildlife conflict"
    p6.level = 1
    
    # Slide 3: Solution
    slide3 = prs.slides.add_slide(prs.slide_layouts[1])
    title3 = slide3.shapes.title
    title3.text = "Seka Kama: Spatial Intelligence Platform"
    
    body3 = slide3.placeholders[1]
    tf3 = body3.text_frame
    tf3.text = "A geospatial digital twin that integrates real-time ecological data, human development patterns, and predictive analytics to support evidence-based conservation planning."
    
    p7 = tf3.add_paragraph()
    p7.text = "Data Integration: Synthesizes 43+ spatial variables"
    
    p8 = tf3.add_paragraph()
    p8.text = "Real-Time Intelligence: Live GBIF lion occurrence data (2015-2024)"
    
    p9 = tf3.add_paragraph()
    p9.text = "Spatial Analysis: PostGIS-powered geospatial queries"
    
    p10 = tf3.add_paragraph()
    p10.text = "Research Interface: Explore spatial relationships"
    
    # Slide 4: Core Modules
    slide4 = prs.slides.add_slide(prs.slide_layouts[1])
    title4 = slide4.shapes.title
    title4.text = "System Architecture: Core Modules"
    
    body4 = slide4.placeholders[1]
    tf4 = body4.text_frame
    tf4.text = "1. Data Ingestion Layer"
    
    p11 = tf4.add_paragraph()
    p11.text = "GBIF API, NASA POWER, OpenStreetMap, Supabase/PostGIS"
    p11.level = 1
    
    p12 = tf4.add_paragraph()
    p12.text = "2. Analytics Engine"
    
    p13 = tf4.add_paragraph()
    p13.text = "XGBoost ML Model, Spatial Processing, HWC Risk, Corridor Analysis"
    p13.level = 1
    
    p14 = tf4.add_paragraph()
    p14.text = "3. Backend API"
    
    p15 = tf4.add_paragraph()
    p15.text = "FastAPI, JWT Authentication, Redis Rate Limiting"
    p15.level = 1
    
    p16 = tf4.add_paragraph()
    p16.text = "4. Frontend Interface"
    
    p17 = tf4.add_paragraph()
    p17.text = "Kepler.gl Mapping, Analytics Dashboard, Export Tools"
    p17.level = 1
    
    # Slide 5: Technology Stack
    slide5 = prs.slides.add_slide(prs.slide_layouts[1])
    title5 = slide5.shapes.title
    title5.text = "Technology Stack & Infrastructure"
    
    body5 = slide5.placeholders[1]
    tf5 = body5.text_frame
    tf5.text = "Backend Technologies"
    
    p18 = tf5.add_paragraph()
    p18.text = "FastAPI (Python 3.11+), Supabase/PostGIS, Redis"
    p18.level = 1
    
    p19 = tf5.add_paragraph()
    p19.text = "XGBoost, NumPy, Shapely"
    p19.level = 1
    
    p20 = tf5.add_paragraph()
    p20.text = "GBIF API, NASA POWER API, OpenAI"
    p20.level = 1
    
    p21 = tf5.add_paragraph()
    p21.text = "Frontend Technologies"
    
    p22 = tf5.add_paragraph()
    p22.text = "Next.js 16.2, React 19.2, TypeScript 5"
    p22.level = 1
    
    p23 = tf5.add_paragraph()
    p23.text = "Kepler.gl, Mapbox GL JS, Tailwind CSS"
    p23.level = 1
    
    p24 = tf5.add_paragraph()
    p24.text = "Recharts, D3.js for visualization"
    p24.level = 1
    
    # Slide 6: Key Functionality
    slide6 = prs.slides.add_slide(prs.slide_layouts[1])
    title6 = slide6.shapes.title
    title6.text = "Platform Capabilities"
    
    body6 = slide6.placeholders[1]
    tf6 = body6.text_frame
    tf6.text = "Real-Time Wildlife Data"
    
    p25 = tf6.add_paragraph()
    p25.text = "1,500+ lion occurrences, 600+ grid cells, 2015-2024"
    p25.level = 1
    
    p26 = tf6.add_paragraph()
    p26.text = "Spatial Analysis"
    
    p27 = tf6.add_paragraph()
    p27.text = "PostGIS geospatial queries, corridor identification"
    p27.level = 1
    
    p28 = tf6.add_paragraph()
    p28.text = "Interactive Visualization"
    
    p29 = tf6.add_paragraph()
    p29.text = "Multi-layer mapping, heatmaps, management units"
    p29.level = 1
    
    p30 = tf6.add_paragraph()
    p30.text = "Predictive Analytics"
    
    p31 = tf6.add_paragraph()
    p31.text = "43-feature ML model, HWC risk assessment"
    p31.level = 1
    
    # Slide 7: Comparison
    slide7 = prs.slides.add_slide(prs.slide_layouts[1])
    title7 = slide7.shapes.title
    title7.text = "Competitive Advantage"
    
    left = Inches(1)
    top = Inches(2)
    width = Inches(8)
    height = Inches(0.8)
    
    txBox = slide7.shapes.add_textbox(left, top, width, height)
    tf7 = txBox.text_frame
    tf7.text = "Key Differentiators:"
    
    p32 = tf7.add_paragraph()
    p32.text = "Purpose-Built: Specifically for East African lion conservation"
    p32.level = 1
    
    p33 = tf7.add_paragraph()
    p33.text = "Data Integration: Wildlife + climate + human development"
    p33.level = 1
    
    p34 = tf7.add_paragraph()
    p34.text = "Accessibility: No GIS expertise required for basic analysis"
    p34.level = 1
    
    p35 = tf7.add_paragraph()
    p35.text = "Real-Time: Live data updates vs static datasets"
    p35.level = 1
    
    p36 = tf7.add_paragraph()
    p36.text = "Predictive: Machine learning for future impact assessment"
    p36.level = 1
    
    # Slide 8: Architecture
    slide8 = prs.slides.add_slide(prs.slide_layouts[5])
    title8 = slide8.shapes.title
    title8.text = "System Architecture & Data Flow"
    
    # Slide 9: Demo
    slide9 = prs.slides.add_slide(prs.slide_layouts[5])
    title9 = slide9.shapes.title
    title9.text = "Platform in Action"
    
    note = slide9.shapes.add_textbox(Inches(2), Inches(3), Inches(6), Inches(1))
    note_tf = note.text_frame
    note_tf.text = "[Insert 4-panel screenshot grid:\n1. Dashboard Overview\n2. Interactive Map\n3. Analytics Panel\n4. API Documentation]"
    note_tf.paragraphs[0].alignment = PP_ALIGN.CENTER
    
    # Slide 10: Impact
    slide10 = prs.slides.add_slide(prs.slide_layouts[1])
    title10 = slide10.shapes.title
    title10.text = "Real-World Applications"
    
    body10 = slide10.placeholders[1]
    tf10 = body10.text_frame
    tf10.text = "Conservation Organizations"
    
    p37 = tf10.add_paragraph()
    p37.text = "Identify priority habitat corridors, monitor trends"
    p37.level = 1
    
    p38 = tf10.add_paragraph()
    p38.text = "Land-Use Planners"
    
    p39 = tf10.add_paragraph()
    p39.text = "Evaluate development proposals, minimize conflict zones"
    p39.level = 1
    
    p40 = tf10.add_paragraph()
    p40.text = "Research Institutions"
    
    p41 = tf10.add_paragraph()
    p41.text = "Access integrated datasets, conduct habitat studies"
    p41.level = 1
    
    p42 = tf10.add_paragraph()
    p42.text = "Government Agencies"
    
    p43 = tf10.add_paragraph()
    p43.text = "Evidence-based policy, protected area management"
    p43.level = 1
    
    # Slide 11: Roadmap
    slide11 = prs.slides.add_slide(prs.slide_layouts[1])
    title11 = slide11.shapes.title
    title11.text = "Roadmap & Future Development"
    
    body11 = slide11.placeholders[1]
    tf11 = body11.text_frame
    tf11.text = "Phase 1: Current State (Complete)"
    
    p44 = tf11.add_paragraph()
    p44.text = "Real-time GBIF integration, Spatial analysis, Interactive mapping"
    p44.level = 1
    
    p45 = tf11.add_paragraph()
    p45.text = "Phase 2: Validation (In Progress)"
    
    p46 = tf11.add_paragraph()
    p46.text = "Model provenance, Scenario simulation validation"
    p46.level = 1
    
    p47 = tf11.add_paragraph()
    p47.text = "Phase 3: Expansion (Planned)"
    
    p48 = tf11.add_paragraph()
    p48.text = "Additional species, Mobile app, Offline mode"
    p48.level = 1
    
    p49 = tf11.add_paragraph()
    p49.text = "Phase 4: Collaboration (Future)"
    
    p50 = tf11.add_paragraph()
    p50.text = "Multi-stakeholder tools, Public API for researchers"
    p50.level = 1
    
    # Slide 12: Technical Highlights
    slide12 = prs.slides.add_slide(prs.slide_layouts[1])
    title12 = slide12.shapes.title
    title12.text = "Innovation & Technical Excellence"
    
    body12 = slide12.placeholders[1]
    tf12 = body12.text_frame
    tf12.text = "Spatial Intelligence"
    
    p51 = tf12.add_paragraph()
    p51.text = "PostGIS complex queries, 1km precision, 43-feature ML model"
    p51.level = 1
    
    p52 = tf12.add_paragraph()
    p52.text = "Production-Ready"
    
    p53 = tf12.add_paragraph()
    p53.text = "Redis distributed rate limiting, JWT auth, structured error handling"
    p53.level = 1
    
    p54 = tf12.add_paragraph()
    p54.text = "Research Integrity"
    
    p55 = tf12.add_paragraph()
    p55.text = "Model card documentation, data provenance, open-source transparency"
    p55.level = 1
    
    # Slide 13: Challenges
    slide13 = prs.slides.add_slide(prs.slide_layouts[1])
    title13 = slide13.shapes.title
    title13.text = "Technical Challenges & Solutions"
    
    body13 = slide13.placeholders[1]
    tf13 = body13.text_frame
    tf13.text = "Real-Time Data Integration"
    
    p56 = tf13.add_paragraph()
    p56.text = "Solution: Caching, exponential backoff, incremental sync"
    p56.level = 1
    
    p57 = tf13.add_paragraph()
    p57.text = "Spatial Query Performance"
    
    p58 = tf13.add_paragraph()
    p58.text = "Solution: Spatial indexing, query optimization, bbox filtering"
    p58.level = 1
    
    p59 = tf13.add_paragraph()
    p59.text = "Model Transparency"
    
    p60 = tf13.add_paragraph()
    p60.text = "Solution: Comprehensive model card, disabled predictions until validation"
    p60.level = 1
    
    # Slide 14: Lessons Learned
    slide14 = prs.slides.add_slide(prs.slide_layouts[1])
    title14 = slide14.shapes.title
    title14.text = "Key Takeaways & Insights"
    
    body14 = slide14.placeholders[1]
    tf14 = body14.text_frame
    tf14.text = "Technical Lessons"
    
    p61 = tf14.add_paragraph()
    p61.text = "Spatial data requires deep understanding of projections and topology"
    p61.level = 1
    
    p62 = tf14.add_paragraph()
    p62.text = "Always implement retries, caching, and fallback strategies"
    p62.level = 1
    
    p63 = tf14.add_paragraph()
    p63.text = "Research Ethics"
    
    p64 = tf14.add_paragraph()
    p64.text = "Validate before claiming, cite sources, document limitations"
    p64.level = 1
    
    # Slide 15: Thank You
    slide15 = prs.slides.add_slide(prs.slide_layouts[6])
    
    thanks_title = slide15.shapes.add_textbox(Inches(1), Inches(2), Inches(8), Inches(1))
    thanks_tf = thanks_title.text_frame
    thanks_tf.text = "Thank You"
    thanks_tf.paragraphs[0].font.size = Pt(48)
    thanks_tf.paragraphs[0].font.bold = True
    thanks_tf.paragraphs[0].font.color.rgb = BRAND_CHARCOAL
    thanks_tf.paragraphs[0].alignment = PP_ALIGN.CENTER
    
    subtitle_thanks = slide15.shapes.add_textbox(Inches(1), Inches(3.2), Inches(8), Inches(0.5))
    subtitle_thanks_tf = subtitle_thanks.text_frame
    subtitle_thanks_tf.text = "Seka Kama: Bridging Conservation and Technology"
    subtitle_thanks_tf.paragraphs[0].font.size = Pt(20)
    subtitle_thanks_tf.paragraphs[0].font.color.rgb = BRAND_GOLD
    subtitle_thanks_tf.paragraphs[0].alignment = PP_ALIGN.CENTER
    
    links = slide15.shapes.add_textbox(Inches(2), Inches(4.5), Inches(6), Inches(2))
    links_tf = links.text_frame
    links_tf.text = "GitHub: github.com/rawscript/Seka_Kama"
    links_tf.paragraphs[0].font.size = Pt(14)
    links_tf.paragraphs[0].alignment = PP_ALIGN.CENTER
    
    p65 = links_tf.add_paragraph()
    p65.text = "Documentation: /docs"
    p65.font.size = Pt(14)
    p65.alignment = PP_ALIGN.CENTER
    
    return prs

if __name__ == "__main__":
    print("Generating Seka Kama pitch deck...")
    presentation = create_presentation()
    output_path = "../docs/Seka_Kama_Pitch_Deck.pptx"
    presentation.save(output_path)
    print(f"Presentation saved to: {output_path}")
    print("\nNext steps:")
    print("1. Open the file in PowerPoint")
    print("2. Replace [Insert...] placeholders with actual screenshots")
    print("3. Add images to slides (use stock images for GIS/tech themes)")
    print("4. Adjust formatting and colors as needed")
    print("5. Add your name and contact information to Slide 1 and 15")
