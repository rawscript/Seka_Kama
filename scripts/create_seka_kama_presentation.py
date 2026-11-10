"""
Create Seka Kama presentation following the template structure
6 slides based on user requirements
"""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
import requests
from io import BytesIO

BRAND_GOLD = RGBColor(119, 90, 25)
BRAND_DARK_GOLD = RGBColor(78, 55, 0)
BRAND_CHARCOAL = RGBColor(26, 28, 28)

def download_stock_image(keyword):
    """Placeholder for stock image download - returns None, user will add manually"""
    return None

def create_presentation():
    # Load the template
    prs = Presentation("../docs/Final year project.pptx")
    
    # Clear all existing slides
    for i in range(len(prs.slides) - 1, -1, -1):
        rId = prs.slides._sldIdLst[i].rId
        prs.part.drop_rel(rId)
        del prs.slides._sldIdLst[i]
    
    # Slide 1: Title Slide - Seka Kama Introduction
    slide1 = prs.slides.add_slide(prs.slide_layouts[6])
    
    # Background - add placeholder for stock image
    left = Inches(0)
    top = Inches(0)
    pic_placeholder = slide1.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(2), Inches(1))
    tf = pic_placeholder.text_frame
    tf.text = "[Add stock image: Aerial satellite view of landscape or GIS map]"
    tf.paragraphs[0].font.size = Pt(10)
    tf.paragraphs[0].font.color.rgb = RGBColor(150, 150, 150)
    
    # Title
    title_box = slide1.shapes.add_textbox(Inches(1), Inches(2.5), Inches(8), Inches(1.5))
    title_frame = title_box.text_frame
    title_frame.text = "Seka Kama"
    p = title_frame.paragraphs[0]
    p.font.size = Pt(54)
    p.font.bold = True
    p.font.color.rgb = BRAND_CHARCOAL
    p.alignment = PP_ALIGN.CENTER
    
    # Subtitle
    subtitle_box = slide1.shapes.add_textbox(Inches(1), Inches(4), Inches(8), Inches(0.8))
    subtitle_frame = subtitle_box.text_frame
    subtitle_frame.text = "Ecological Digital Twin for Wildlife Conservation"
    p2 = subtitle_frame.paragraphs[0]
    p2.font.size = Pt(24)
    p2.font.color.rgb = BRAND_GOLD
    p2.alignment = PP_ALIGN.CENTER
    
    # Slide 2: Core Modules
    slide2 = prs.slides.add_slide(prs.slide_layouts[6])
    
    # Image placeholder
    pic2 = slide2.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(2), Inches(1))
    tf2 = pic2.text_frame
    tf2.text = "[Add stock image: System architecture diagram or technology infrastructure]"
    tf2.paragraphs[0].font.size = Pt(10)
    tf2.paragraphs[0].font.color.rgb = RGBColor(150, 150, 150)
    
    # Title
    title2 = slide2.shapes.add_textbox(Inches(1), Inches(1.5), Inches(8), Inches(0.8))
    tf_title2 = title2.text_frame
    tf_title2.text = "Core Modules"
    tf_title2.paragraphs[0].font.size = Pt(40)
    tf_title2.paragraphs[0].font.bold = True
    tf_title2.paragraphs[0].font.color.rgb = BRAND_CHARCOAL
    tf_title2.paragraphs[0].alignment = PP_ALIGN.CENTER
    
    # Content
    content2 = slide2.shapes.add_textbox(Inches(1.5), Inches(2.8), Inches(7), Inches(3.5))
    tf_content2 = content2.text_frame
    tf_content2.text = "1. Data Ingestion Layer"
    p = tf_content2.paragraphs[0]
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = BRAND_GOLD
    
    for text in [
        "   GBIF API, NASA POWER, OpenStreetMap, Supabase/PostGIS",
        "\n2. Analytics Engine",
        "   XGBoost ML Model, Spatial Processing, HWC Risk Calculation",
        "\n3. Backend API",
        "   FastAPI, JWT Authentication, Redis Rate Limiting",
        "\n4. Frontend Interface",
        "   Kepler.gl Mapping, Analytics Dashboard, Export Tools"
    ]:
        p = tf_content2.add_paragraph()
        p.text = text
        if text.startswith('\n'):
            p.font.bold = True
            p.font.color.rgb = BRAND_GOLD
            p.font.size = Pt(18)
        else:
            p.font.size = Pt(14)
            p.font.color.rgb = BRAND_CHARCOAL
            p.level = 1
    
    # Slide 3: Technologies Used
    slide3 = prs.slides.add_slide(prs.slide_layouts[6])
    
    # Image placeholder
    pic3 = slide3.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(2), Inches(1))
    tf3 = pic3.text_frame
    tf3.text = "[Add stock image: Technology stack or cloud infrastructure]"
    tf3.paragraphs[0].font.size = Pt(10)
    tf3.paragraphs[0].font.color.rgb = RGBColor(150, 150, 150)
    
    # Title
    title3 = slide3.shapes.add_textbox(Inches(1), Inches(1.5), Inches(8), Inches(0.8))
    tf_title3 = title3.text_frame
    tf_title3.text = "Technologies Used"
    tf_title3.paragraphs[0].font.size = Pt(40)
    tf_title3.paragraphs[0].font.bold = True
    tf_title3.paragraphs[0].font.color.rgb = BRAND_CHARCOAL
    tf_title3.paragraphs[0].alignment = PP_ALIGN.CENTER
    
    # Two column layout
    # Left column - Backend
    left_col = slide3.shapes.add_textbox(Inches(1.5), Inches(2.8), Inches(3.5), Inches(3.5))
    tf_left = left_col.text_frame
    tf_left.text = "Backend Technologies"
    p = tf_left.paragraphs[0]
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = BRAND_GOLD
    
    backend_tech = [
        "FastAPI (Python 3.11+)",
        "Supabase/PostGIS",
        "Redis",
        "XGBoost, NumPy, Shapely",
        "GBIF API, NASA POWER"
    ]
    
    for tech in backend_tech:
        p = tf_left.add_paragraph()
        p.text = tech
        p.font.size = Pt(12)
        p.font.color.rgb = BRAND_CHARCOAL
    
    # Right column - Frontend
    right_col = slide3.shapes.add_textbox(Inches(5.5), Inches(2.8), Inches(3.5), Inches(3.5))
    tf_right = right_col.text_frame
    tf_right.text = "Frontend Technologies"
    p = tf_right.paragraphs[0]
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = BRAND_GOLD
    
    frontend_tech = [
        "Next.js 16.2",
        "React 19.2",
        "TypeScript 5",
        "Kepler.gl, Mapbox GL",
        "Tailwind CSS"
    ]
    
    for tech in frontend_tech:
        p = tf_right.add_paragraph()
        p.text = tech
        p.font.size = Pt(12)
        p.font.color.rgb = BRAND_CHARCOAL
    
    # Slide 4: Functionality
    slide4 = prs.slides.add_slide(prs.slide_layouts[6])
    
    # Image placeholder
    pic4 = slide4.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(2), Inches(1))
    tf4 = pic4.text_frame
    tf4.text = "[Add stock image: Data dashboard or analytics visualization]"
    tf4.paragraphs[0].font.size = Pt(10)
    tf4.paragraphs[0].font.color.rgb = RGBColor(150, 150, 150)
    
    # Title
    title4 = slide4.shapes.add_textbox(Inches(1), Inches(1.5), Inches(8), Inches(0.8))
    tf_title4 = title4.text_frame
    tf_title4.text = "Platform Functionality"
    tf_title4.paragraphs[0].font.size = Pt(40)
    tf_title4.paragraphs[0].font.bold = True
    tf_title4.paragraphs[0].font.color.rgb = BRAND_CHARCOAL
    tf_title4.paragraphs[0].alignment = PP_ALIGN.CENTER
    
    # Content
    content4 = slide4.shapes.add_textbox(Inches(1.5), Inches(2.8), Inches(7), Inches(3.5))
    tf_content4 = content4.text_frame
    
    functionalities = [
        ("Real-Time Wildlife Data", "1,500+ lion occurrences, 600+ grid cells, 2015-2024"),
        ("Spatial Analysis", "PostGIS geospatial queries, corridor identification"),
        ("Interactive Visualization", "Multi-layer mapping, heatmaps, management units"),
        ("Predictive Analytics", "43-feature ML model, HWC risk assessment"),
        ("User Management", "Role-based access, API keys, audit logging"),
        ("Data Export", "GeoJSON, CSV exports, RESTful API")
    ]
    
    for i, (title, desc) in enumerate(functionalities):
        if i == 0:
            p = tf_content4.paragraphs[0]
        else:
            p = tf_content4.add_paragraph()
        
        p.text = title
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = BRAND_GOLD
        
        p2 = tf_content4.add_paragraph()
        p2.text = desc
        p2.font.size = Pt(11)
        p2.font.color.rgb = BRAND_CHARCOAL
        p2.level = 1
    
    # Slide 5: Comparison with Existing Systems
    slide5 = prs.slides.add_slide(prs.slide_layouts[6])
    
    # Image placeholder
    pic5 = slide5.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(2), Inches(1))
    tf5 = pic5.text_frame
    tf5.text = "[Add stock image: Comparison chart or competitive analysis]"
    tf5.paragraphs[0].font.size = Pt(10)
    tf5.paragraphs[0].font.color.rgb = RGBColor(150, 150, 150)
    
    # Title
    title5 = slide5.shapes.add_textbox(Inches(1), Inches(1.5), Inches(8), Inches(0.8))
    tf_title5 = title5.text_frame
    tf_title5.text = "Competitive Advantage"
    tf_title5.paragraphs[0].font.size = Pt(40)
    tf_title5.paragraphs[0].font.bold = True
    tf_title5.paragraphs[0].font.color.rgb = BRAND_CHARCOAL
    tf_title5.paragraphs[0].alignment = PP_ALIGN.CENTER
    
    # Comparison content
    content5 = slide5.shapes.add_textbox(Inches(1.5), Inches(2.8), Inches(7), Inches(3.5))
    tf_content5 = content5.text_frame
    tf_content5.text = "vs Traditional GIS (QGIS/ArcGIS)"
    p = tf_content5.paragraphs[0]
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = BRAND_GOLD
    
    advantages = [
        "Wildlife-Specific: Purpose-built for lion conservation",
        "Real-Time Data: Live GBIF integration vs manual updates",
        "Web-Based: Full browser access vs desktop software",
        "ML Predictions: Built-in model vs manual analysis",
        "Open Source: Fully open vs proprietary costs"
    ]
    
    for adv in advantages:
        p = tf_content5.add_paragraph()
        p.text = adv
        p.font.size = Pt(14)
        p.font.color.rgb = BRAND_CHARCOAL
    
    # Slide 6: Thank You
    slide6 = prs.slides.add_slide(prs.slide_layouts[6])
    
    # Image placeholder
    pic6 = slide6.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(2), Inches(1))
    tf6 = pic6.text_frame
    tf6.text = "[Add stock image: Thank you or collaboration theme]"
    tf6.paragraphs[0].font.size = Pt(10)
    tf6.paragraphs[0].font.color.rgb = RGBColor(150, 150, 150)
    
    # Thank you text
    thanks_box = slide6.shapes.add_textbox(Inches(1), Inches(2.5), Inches(8), Inches(1))
    thanks_frame = thanks_box.text_frame
    thanks_frame.text = "Thank You"
    p = thanks_frame.paragraphs[0]
    p.font.size = Pt(48)
    p.font.bold = True
    p.font.color.rgb = BRAND_CHARCOAL
    p.alignment = PP_ALIGN.CENTER
    
    # Links
    links_box = slide6.shapes.add_textbox(Inches(2), Inches(4.5), Inches(6), Inches(1.5))
    links_frame = links_box.text_frame
    links_frame.text = "GitHub: github.com/rawscript/Seka_Kama"
    p1 = links_frame.paragraphs[0]
    p1.font.size = Pt(14)
    p1.alignment = PP_ALIGN.CENTER
    
    p2 = links_frame.add_paragraph()
    p2.text = "Documentation: /docs"
    p2.font.size = Pt(14)
    p2.alignment = PP_ALIGN.CENTER
    
    return prs

if __name__ == "__main__":
    print("Creating Seka Kama presentation (6 slides)...")
    presentation = create_presentation()
    output_path = "../docs/Seka_Kama_Final_Presentation.pptx"
    presentation.save(output_path)
    print(f"\nPresentation created: {output_path}")
    print("\n6 SLIDES CREATED:")
    print("1. Title - Seka Kama Introduction")
    print("2. Core Modules")
    print("3. Technologies Used")
    print("4. Functionality")
    print("5. Comparison with Existing Systems")
    print("6. Thank You")
    print("\nNOTE: Image placeholders added - please insert stock images:")
    print("- Slide 1: Aerial satellite/GIS map")
    print("- Slide 2: System architecture diagram")
    print("- Slide 3: Technology stack/cloud")
    print("- Slide 4: Data dashboard")
    print("- Slide 5: Comparison chart")
    print("- Slide 6: Thank you/collaboration")
