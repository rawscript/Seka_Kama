from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION_START
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'Chapter Two Proposed System Design Seka Kama.docx'
ASSETS = ROOT / 'chapter_two_assets'
ASSETS.mkdir(exist_ok=True)

NAVY = '#17324D'
TEAL = '#1F6F78'
PALE = '#EAF3F3'
GRAY = '#D9E1E8'

def font(size, bold=False):
    candidates = [r'C:\\Windows\\Fonts\\calibri.ttf', r'C:\\Windows\\Fonts\\arial.ttf']
    if bold:
        candidates = [r'C:\\Windows\\Fonts\\calibrib.ttf', r'C:\\Windows\\Fonts\\arialbd.ttf']
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()

def rounded(draw, box, fill, outline=NAVY, width=2, radius=14):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def centered(draw, box, text, fnt, fill='#111111', line_gap=4):
    left, top, right, bottom = box
    words = text.split()
    lines, line = [], ''
    max_width = right-left-24
    for word in words:
        trial = (line + ' ' + word).strip()
        if draw.textbbox((0,0), trial, font=fnt)[2] <= max_width:
            line = trial
        else:
            lines.append(line); line = word
    if line: lines.append(line)
    heights = [draw.textbbox((0,0), x, font=fnt)[3] for x in lines]
    y = top + ((bottom-top) - sum(heights) - line_gap*(len(lines)-1)) / 2
    for i, line in enumerate(lines):
        boxw = draw.textbbox((0,0), line, font=fnt)[2]
        draw.text((left+(right-left-boxw)/2, y), line, font=fnt, fill=fill)
        y += heights[i]+line_gap

def arrow(draw, start, end, label=None, label_offset=(0,0)):
    draw.line([start, end], fill=NAVY, width=3)
    x1,y1=start; x2,y2=end
    import math
    angle=math.atan2(y2-y1,x2-x1)
    ah=12
    for delta in (2.6,-2.6):
        draw.line([(x2,y2),(x2+ah*math.cos(angle+delta),y2+ah*math.sin(angle+delta))],fill=NAVY,width=3)
    if label:
        f=font(18)
        mx,my=(x1+x2)/2+label_offset[0],(y1+y2)/2+label_offset[1]
        w=draw.textbbox((0,0), label,font=f)[2]
        draw.rounded_rectangle((mx-w/2-5,my-12,mx+w/2+5,my+15),radius=4,fill='#FFFFFF')
        draw.text((mx-w/2,my-10),label,font=f,fill=NAVY)

def draw_context(path):
    im=Image.new('RGB',(1600,930),'#FFFFFF'); d=ImageDraw.Draw(im)
    title=font(30,True); lbl=font(24,True); sub=font(20)
    d.text((60,35),'Seka Kama proposed context level data flow',font=title,fill=NAVY)
    rounded(d,(585,310,1015,600),PALE,TEAL,3,26); centered(d,(605,340,995,570),'Seka Kama Decision Support Platform',font(30,True),NAVY)
    rounded(d,(70,130,400,315),'#F3FAFC',TEAL,2); centered(d,(90,150,380,295),'Conservation planner or researcher',lbl,NAVY)
    rounded(d,(1200,125,1530,310),'#F3FAFC',TEAL,2); centered(d,(1220,145,1510,290),'Ecological and spatial data providers',lbl,NAVY)
    rounded(d,(75,635,405,820),'#F3FAFC',TEAL,2); centered(d,(95,655,385,800),'System administrator',lbl,NAVY)
    rounded(d,(1195,635,1525,820),'#F3FAFC',TEAL,2); centered(d,(1215,655,1505,800),'Maps, reports and decision users',lbl,NAVY)
    arrow(d,(400,250),(585,390),'scenario request',(0,-25)); arrow(d,(585,490),(400,275),'results and explanation',(0,28))
    arrow(d,(1200,250),(1015,390),'spatial layers and indicators',(0,-26)); arrow(d,(1015,490),(1200,280),'validation feedback',(0,28))
    arrow(d,(405,710),(585,535),'user and access management',(10,20)); arrow(d,(1015,535),(1195,710),'maps, exports and alerts',(0,22))
    d.text((60,875),'The diagram describes the boundary of the proposed system. It does not show internal databases or model steps.',font=sub,fill='#444444')
    im.save(path)

def draw_level1(path):
    im=Image.new('RGB',(1600,1050),'#FFFFFF'); d=ImageDraw.Draw(im)
    d.text((55,30),'Seka Kama proposed level one data flow',font=font(30,True),fill=NAVY)
    fbox=font(22,True); fsmall=font(18)
    processes=[((105,170,390,330),'1. Manage access and requests'),((655,170,945,330),'2. Prepare spatial and ecological data'),((1195,170,1490,330),'3. Run scenario prediction'),((655,615,945,775),'4. Explain, map and export results')]
    for box,text in processes: rounded(d,box,PALE,TEAL,3,18); centered(d,box,text,fbox,NAVY)
    stores=[((100,725,410,885),'D1 Users and audit log'),((575,860,1025,1005),'D2 Spatial data store'),((1190,725,1500,885),'D3 Scenario history')]
    for box,text in stores:
        d.rounded_rectangle(box,radius=12,fill='#F7F7F7',outline='#6C7A89',width=2)
        d.line([(box[0],box[1]+24),(box[2],box[1]+24)],fill='#6C7A89',width=2)
        centered(d,(box[0]+8,box[1]+25,box[2]-8,box[3]-5),text,font(20,True),NAVY)
    rounded(d,(95,440,390,570),'#F3FAFC',TEAL,2); centered(d,(110,455,375,555),'Planner or researcher',fbox,NAVY)
    rounded(d,(1210,440,1505,570),'#F3FAFC',TEAL,2); centered(d,(1225,455,1490,555),'Data provider',fbox,NAVY)
    arrow(d,(390,505),(655,275),'credentials and proposed changes',(-35,-22)); arrow(d,(945,275),(1195,275),'validated features',(0,-22)); arrow(d,(1345,330),(800,615),'prediction and affected cells',(-45,-20)); arrow(d,(800,615),(390,535),'map, narrative and export',(-20,-22))
    arrow(d,(245,570),(255,725),'identity and activity',(60,0)); arrow(d,(1370,440),(945,275),'source layers',(0,-20)); arrow(d,(800,330),(800,860),'clean data and model inputs',(-110,0)); arrow(d,(1340,330),(1340,725),'scenario record',(-62,0)); arrow(d,(945,695),(1190,800),'saved result',(0,-20)); arrow(d,(945,745),(1025,925),'spatial query',(0,-20))
    d.text((55,1018),'Arrows show the information that will move between people, processes and stores. D1-D3 are logical stores, not separate software products.',font=fsmall,fill='#444444')
    im.save(path)

def entity(draw, box, heading, attributes):
    x1,y1,x2,y2=box
    draw.rounded_rectangle(box,radius=12,fill='#FFFFFF',outline=NAVY,width=3)
    draw.rounded_rectangle((x1,y1,x2,y1+46),radius=12,fill=TEAL,outline=TEAL)
    draw.rectangle((x1,y1+30,x2,y1+46),fill=TEAL)
    centered(draw,(x1+5,y1+3,x2-5,y1+43),heading,font(21,True),'#FFFFFF')
    y=y1+58
    for a in attributes:
        draw.text((x1+18,y),a,font=font(18),fill='#111111'); y+=27

def draw_erd(path):
    im=Image.new('RGB',(1600,1120),'#FFFFFF'); d=ImageDraw.Draw(im)
    d.text((55,28),'Seka Kama proposed entity relationship model',font=font(30,True),fill=NAVY)
    entity(d,(65,155,450,390),'USERS',['PK id','email (unique)','full_name','organization','role','created_at'])
    entity(d,(600,120,1000,410),'SCENARIO HISTORY',['PK id','FK user_id','user_description','modified_features','baseline_total_lions','predicted_total_lions','created_at'])
    entity(d,(1150,155,1535,390),'GRID CELLS',['PK cell_id','geom and centroid','management_unit','baseline_lion_density','ecological features','year'])
    entity(d,(105,610,430,835),'API KEYS',['PK id','FK user_id','name','key_hash','is_active','created_at'])
    entity(d,(635,610,970,835),'AUDIT LOGS',['PK id','FK user_id','action','resource_type','details','created_at'])
    entity(d,(1165,610,1525,835),'PROTECTED AREAS',['PK id','site_name','designation','iucn_category','area_km2','geom'])
    entity(d,(600,910,1000,1070),'CONTACT SUBMISSIONS',['PK id','name','organization','email','message','submitted_at'])
    arrow(d,(450,245),(600,245),'1 creates many',(0,-23)); arrow(d,(450,300),(635,690),'1 records many',(0,20)); arrow(d,(275,390),(275,610),'1 owns many',(68,0))
    arrow(d,(1000,285),(1150,285),'reads many cells',(0,-23)); arrow(d,(1335,390),(1335,610),'spatial reference',(64,0))
    d.text((65,1090),'PK means primary key. FK means foreign key. The proposed design retains existing tables and makes their relationships clear for implementation and reporting.',font=font(18),fill='#444444')
    im.save(path)

def set_cell_shading(cell, fill):
    tcPr=cell._tc.get_or_add_tcPr(); shd=OxmlElement('w:shd'); shd.set(qn('w:fill'),fill); tcPr.append(shd)

def set_repeat_table_header(row):
    trPr=row._tr.get_or_add_trPr(); tblHeader=OxmlElement('w:tblHeader'); tblHeader.set(qn('w:val'),'true'); trPr.append(tblHeader)

def set_cell_margins(cell, top=100, start=120, bottom=100, end=120):
    tc=cell._tc; tcPr=tc.get_or_add_tcPr(); tcMar=tcPr.first_child_found_in('w:tcMar')
    if tcMar is None: tcMar=OxmlElement('w:tcMar'); tcPr.append(tcMar)
    for m,v in [('top',top),('start',start),('bottom',bottom),('end',end)]:
        node=tcMar.find(qn('w:'+m))
        if node is None: node=OxmlElement('w:'+m); tcMar.append(node)
        node.set(qn('w:w'),str(v)); node.set(qn('w:type'),'dxa')

def add_para(doc, text='', style=None, bold_lead=None):
    p=doc.add_paragraph(style=style)
    if bold_lead and text.startswith(bold_lead):
        p.add_run(bold_lead).bold=True; p.add_run(text[len(bold_lead):])
    else: p.add_run(text)
    p.paragraph_format.space_after=Pt(7)
    p.paragraph_format.line_spacing=1.15
    return p

def add_figure(doc, image, caption):
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before=Pt(8); p.paragraph_format.space_after=Pt(3)
    p.add_run().add_picture(str(image),width=Inches(6.55))
    c=doc.add_paragraph(); c.alignment=WD_ALIGN_PARAGRAPH.CENTER
    c.paragraph_format.space_after=Pt(10)
    r=c.add_run(caption); r.italic=True; r.font.size=Pt(9)

def add_table(doc, headers, rows, widths):
    table=doc.add_table(rows=1,cols=len(headers)); table.alignment=WD_TABLE_ALIGNMENT.CENTER
    table.style='Table Grid'; hdr=table.rows[0]; set_repeat_table_header(hdr)
    for i,h in enumerate(headers):
        cell=hdr.cells[i]; cell.width=Inches(widths[i]); set_cell_shading(cell,NAVY); set_cell_margins(cell)
        cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
        r=cell.paragraphs[0].add_run(h); r.bold=True; r.font.color.rgb=RGBColor(255,255,255); r.font.size=Pt(9)
    for ri,row in enumerate(rows):
        cells=table.add_row().cells
        for i,val in enumerate(row):
            cells[i].width=Inches(widths[i]); set_cell_margins(cells[i]); cells[i].vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            if ri%2==1: set_cell_shading(cells[i],'F4F8FA')
            p=cells[i].paragraphs[0]; p.paragraph_format.space_after=Pt(0); p.paragraph_format.line_spacing=1.05
            run=p.add_run(val); run.font.size=Pt(8.5)
    doc.add_paragraph().paragraph_format.space_after=Pt(2)
    return table

def build():
    context=ASSETS/'dfd_context.png'; level1=ASSETS/'dfd_level1.png'; erd=ASSETS/'erd.png'
    draw_context(context); draw_level1(level1); draw_erd(erd)
    doc=Document(); section=doc.sections[0]
    section.top_margin=Inches(.72); section.bottom_margin=Inches(.72); section.left_margin=Inches(.78); section.right_margin=Inches(.78)
    styles=doc.styles
    styles['Normal'].font.name='Calibri'; styles['Normal']._element.rPr.rFonts.set(qn('w:ascii'),'Calibri'); styles['Normal']._element.rPr.rFonts.set(qn('w:hAnsi'),'Calibri'); styles['Normal'].font.size=Pt(10.5)
    for name,size in [('Title',22),('Heading 1',15),('Heading 2',12)]:
        s=styles[name]; s.font.name='Calibri'; s.font.size=Pt(size); s.font.color.rgb=RGBColor(0,0,0); s.font.bold=True
    title=doc.add_paragraph(style='Title'); title.alignment=WD_ALIGN_PARAGRAPH.CENTER; title.add_run('Chapter Two Proposed System Design')
    subtitle=doc.add_paragraph(); subtitle.alignment=WD_ALIGN_PARAGRAPH.CENTER; subtitle.add_run('Seka Kama Ecological Decision Support Platform').italic=True
    subtitle.paragraph_format.space_after=Pt(18)
    add_para(doc,'This chapter presents the proposed design for Seka Kama. Although a working platform already exists, the discussion deliberately uses proposal language to show how the system will be understood, extended and maintained as a complete decision-support solution. The design will help conservation planners test land-use choices, see likely ecological effects and keep a clear record of the evidence behind each result.')
    h=doc.add_paragraph('2.1 Overview of the Proposed System',style='Heading 1')
    add_para(doc,'The proposed Seka Kama system will combine spatial data, ecological indicators and predictive modelling in one accessible workspace. A user will be able to define an area of interest, describe a planned change such as increased settlement or vegetation recovery, and request a scenario. The system will then select the affected grid cells, apply the proposed feature changes, run the prediction model and return a map, summary figures and a plain-language explanation.')
    add_para(doc,'The proposal will build on the platform components already present in the project: a web interface, an API layer, a spatial database, a trained XGBoost prediction model and export services. The design will not treat a model output as an automatic decision. Instead, it will present the result as evidence that planners, researchers and community partners can discuss alongside local knowledge and field observations.')
    h=doc.add_paragraph('2.2 Proposed System Objectives',style='Heading 1')
    add_table(doc,['Objective','How the proposed system will respond'],[
        ('Bring information together','It will combine grid-cell, protected-area, rainfall, vegetation, nightlight and human-wildlife conflict indicators in a structured spatial store.'),
        ('Support informed scenarios','It will let authorised users propose feature changes within a selected geography and compare predicted outcomes with a baseline.'),
        ('Make results understandable','It will return a map, a numerical summary and a readable explanation rather than leaving users with a model score alone.'),
        ('Protect accountability','It will record scenario requests, user activity and exports so that later reviews can trace how an output was produced.'),
        ('Preserve secure access','It will use user roles, authenticated requests and managed API keys to control access to sensitive functions and data.')], [1.55,5.0])
    h=doc.add_paragraph('2.3 Main Users and Their Roles',style='Heading 1')
    add_para(doc,'The proposed platform will serve people with different responsibilities. The interface will keep their tasks simple while the backend will keep the scientific and spatial details consistent.')
    add_table(doc,['User group','What the user will do','What the system will provide'],[
        ('Conservation planner','Define a development or restoration scenario.','Interactive map, baseline comparison and exportable decision material.'),
        ('Researcher or analyst','Review inputs, test assumptions and interpret trends.','Spatial filters, feature summaries, scenario history and model explanations.'),
        ('Data steward','Load, validate and update approved layers.','Controlled ingestion path, spatial checks and traceable updates.'),
        ('Administrator','Manage access and investigate activity.','User roles, API-key management and audit records.')], [1.25,2.65,2.65])
    h=doc.add_paragraph('2.4 Proposed Data Flow Design',style='Heading 1')
    add_para(doc,'The data-flow design will show how information will enter the platform, move through its processing steps and return to the people who need it. It will separate the platform boundary from its internal work so that users can see both the broad picture and the detailed path of a scenario request.')
    add_figure(doc,context,'Figure 2.1 Proposed context-level data-flow diagram for Seka Kama')
    add_para(doc,'At context level, the platform will receive scenario requests from planners and researchers, source layers from ecological and spatial data providers, and access-management actions from administrators. In return, it will provide maps, results, alerts and exports. This view will help stakeholders agree on responsibilities before adding technical detail.')
    add_figure(doc,level1,'Figure 2.2 Proposed level-one data-flow diagram for Seka Kama')
    add_para(doc,'At level one, the proposed system will first verify the user and preserve an activity record. It will then prepare the relevant spatial and ecological data, pass validated features to the prediction service and store the outcome with its scenario details. The final process will turn the calculated result into a map, explanation and export. Keeping these steps distinct will make it easier to test the platform and identify where an unexpected result originated.')
    h=doc.add_paragraph('2.5 Proposed Scenario Processing',style='Heading 1')
    add_table(doc,['Step','Proposed behaviour','Output'],[
        ('1. Define area and change','The user will draw or submit a GeoJSON polygon, select management units if needed, and describe proposed feature modifications.','Validated scenario request.'),
        ('2. Select relevant evidence','The spatial service will find grid cells that intersect the chosen area and retrieve their baseline ecological features.','Affected cells and baseline values.'),
        ('3. Apply scenario assumptions','The prediction service will apply the requested feature adjustments without overwriting baseline records.','Scenario feature set.'),
        ('4. Predict and compare','The model will estimate outcomes for the scenario and compare them with the stored baseline.','Predicted total, change in lions and affected units.'),
        ('5. Explain and retain','The platform will prepare narrative and map outputs, then save the scenario and activity record for review.','Decision material and audit trail.')], [1.45,3.6,1.5])
    h=doc.add_paragraph('2.6 Proposed Entity Relationship Design',style='Heading 1')
    add_para(doc,'The entity relationship design will organise the information that the platform needs to operate safely and consistently. It will use the database structures already represented in the system, while making the connections between user activity, scenario records and spatial evidence explicit. Spatial features will remain in geometry-aware tables so that map queries will be accurate and efficient.')
    add_figure(doc,erd,'Figure 2.3 Proposed entity-relationship diagram for the Seka Kama database')
    add_para(doc,'A user will be able to own multiple API keys, create multiple scenario records and generate multiple audit-log entries. Each scenario will read many grid cells, but it will preserve only its request and result details rather than duplicating the full spatial dataset. Protected areas will remain a separate spatial reference layer that can be compared with the selected grid cells. Contact submissions will be kept separate because they support communication rather than analysis.')
    h=doc.add_paragraph('2.7 Core Data Entities',style='Heading 1')
    add_table(doc,['Entity','Purpose in the proposed system','Important relationships'],[
        ('Users','Will hold identity, organisation, role, access status and preferences for platform users.','One user will relate to many API keys, scenario records and audit logs.'),
        ('Grid Cells','Will store the analysis units, their geometry, baseline lion density, environmental features and year.','Many cells will be selected by a scenario; cells will be spatially compared with protected areas.'),
        ('Scenario History','Will preserve the request, modified features, baseline result, predicted result and readable narrative.','Many scenario records will belong to one user.'),
        ('Protected Areas','Will hold conservation boundary geometry and descriptive attributes.','Will provide a spatial reference for distance and overlap analysis.'),
        ('Audit Logs','Will record actions such as sign-in, scenario run, export or data update.','Many log entries will belong to one user.'),
        ('API Keys','Will support controlled programmatic access without exposing user passwords.','Many keys will belong to one user.')], [1.45,3.55,1.55])
    h=doc.add_paragraph('2.8 Data Quality, Privacy and Security',style='Heading 1')
    add_para(doc,'The proposed system will validate incoming geometry, required scenario fields and acceptable feature ranges before a prediction runs. Spatial layers will use a consistent coordinate reference system, and the database will use spatial indexes to support efficient area queries. The system will keep baseline data separate from scenario changes so that a user can repeat a comparison without corrupting the reference dataset.')
    add_para(doc,'Access will be role-based. Passwords and API keys will be stored as hashes, authenticated requests will be checked before protected actions, and row-level policies will limit access to sensitive records. Audit logs will provide a practical way to review significant activity, while exports will be created only for users who have the appropriate permission.')
    h=doc.add_paragraph('2.9 Chapter Summary',style='Heading 1')
    add_para(doc,'The proposed Seka Kama design will turn existing components into a clear end-to-end decision-support workflow. It will receive a proposed land-use or conservation change, connect that change to trusted spatial evidence, generate a prediction, communicate the result in a usable form and keep a traceable record. The data-flow diagrams and entity relationship model will guide implementation, testing and future extensions without changing the scientific purpose of the platform.')
    footer=section.footer.paragraphs[0]; footer.alignment=WD_ALIGN_PARAGRAPH.CENTER; footer.add_run('Seka Kama Proposed System Design | Chapter Two').font.size=Pt(8)
    doc.core_properties.title='Chapter Two Proposed System Design'
    doc.core_properties.subject='Proposed design for the Seka Kama ecological decision support platform'
    doc.save(OUT)

if __name__=='__main__': build()
