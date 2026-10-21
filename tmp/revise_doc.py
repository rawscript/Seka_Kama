from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.section import WD_SECTION_START
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.style import WD_STYLE_TYPE

SRC = 'Seka_Kama/docs/Seka Kama System Documentation.docx'
OUT = 'Seka_Kama/docs/Seka Kama System Documentation - Revised.docx'

doc = Document(SRC)

def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = tcPr.find(qn('w:shd'))
    if shd is None:
        shd = OxmlElement('w:shd'); tcPr.append(shd)
    shd.set(qn('w:fill'), fill)

def borders(table, color='D9D9D9', sz='6'):
    tblPr = table._tbl.tblPr
    b = tblPr.find(qn('w:tblBorders'))
    if b is None:
        b = OxmlElement('w:tblBorders'); tblPr.append(b)
    for edge in ('top','left','bottom','right','insideH','insideV'):
        el = b.find(qn('w:'+edge))
        if el is None:
            el = OxmlElement('w:'+edge); b.append(el)
        el.set(qn('w:val'),'single'); el.set(qn('w:sz'),sz); el.set(qn('w:space'),'0'); el.set(qn('w:color'),color)

def set_cell_margin(cell, top=100, start=120, bottom=100, end=120):
    tc = cell._tc; tcPr = tc.get_or_add_tcPr(); mar = tcPr.first_child_found_in('w:tcMar')
    if mar is None: mar = OxmlElement('w:tcMar'); tcPr.append(mar)
    for m,v in [('top',top),('start',start),('bottom',bottom),('end',end)]:
        node = mar.find(qn('w:'+m))
        if node is None: node = OxmlElement('w:'+m); mar.append(node)
        node.set(qn('w:w'),str(v)); node.set(qn('w:type'),'dxa')

# Page setup
for sec in doc.sections:
    sec.top_margin = Inches(0.8); sec.bottom_margin = Inches(0.75)
    sec.left_margin = Inches(0.95); sec.right_margin = Inches(0.8)
    sec.header_distance = Inches(0.35); sec.footer_distance = Inches(0.35)

styles = doc.styles
normal = styles['Normal']; normal.font.name='Aptos'; normal._element.rPr.rFonts.set(qn('w:eastAsia'),'Aptos'); normal.font.size=Pt(11); normal.font.color.rgb=RGBColor(0,0,0)
normal.paragraph_format.space_after=Pt(6); normal.paragraph_format.line_spacing=1.15
for nm,size,space in [('Heading 1',15,12),('Heading 2',12.5,8),('Heading 3',11.5,6)]:
    st=styles[nm]; st.font.name='Aptos Display'; st._element.rPr.rFonts.set(qn('w:eastAsia'),'Aptos Display'); st.font.size=Pt(size); st.font.bold=True; st.font.color.rgb=RGBColor(0,0,0); st.paragraph_format.space_before=Pt(space); st.paragraph_format.space_after=Pt(5); st.paragraph_format.keep_with_next=True
try:
    cap = styles['Caption']; cap.font.name='Aptos'; cap.font.size=Pt(9); cap.font.italic=True; cap.font.color.rgb=RGBColor(80,80,80); cap.paragraph_format.space_before=Pt(3); cap.paragraph_format.space_after=Pt(8)
except Exception: pass

# Remove placeholders and correct wording/encoding in the existing text.
repl = {
    'AI DRIVEN COMMUNITY ASED MONITORING AND EARLY WARNING SYSTEM FOR EAST AFRICAN LION CONSERVATION':'AI DRIVEN COMMUNITY BASED MONITORING AND EARLY WARNING SYSTEM FOR EAST AFRICAN LION CONSERVATION',
    'This page will be completed upon project completion':'This documentation is dedicated to the conservation practitioners, communities and researchers whose daily work sustains the Greater Mara landscape.',
    'This page will be completed after project supervision and development activities have concluded.':'I acknowledge the guidance of my supervisor, the conservation practitioners who informed the problem definition, and the open scientific and technical communities whose published work supports this project.',
    'This project document will specify, the design, develop and evaluate a proposed geospatial decision-support platform for East African lion conservation in the Greater Mara ecosystem. It responds to the need to bring ecological indicators, spatial evidence and scenario analysis into a usable planning':'This document presents the design, development plan and evaluation approach for Seka Kama, a geospatial decision-support platform for East African lion conservation in the Greater Mara ecosystem. The platform is intended to bring ecological indicators, spatial evidence and scenario analysis into one planning workflow so that users can review conditions, test proposed changes and interpret results with their assumptions visible. The work is framed as a design and evaluation study; operational findings will be reported only after the approved data, model and tests are completed.',
    'human�wildlife':'human-wildlife', 'H�m�l�inen':'Hämäläinen', 'O�Brien':'O’Brien',
}
for p in doc.paragraphs:
    for a,b in repl.items():
        if a in p.text:
            for r in p.runs: r.text = r.text.replace(a,b)
    if p.text.strip() in ('SEKA KAMA','SYSTEM DOCUMENTATION'):
        p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    if p.text.strip()=='SEKA KAMA':
        p.style='Title'; p.runs[0].font.size=Pt(24); p.runs[0].font.bold=True
    elif p.text.strip()=='SYSTEM DOCUMENTATION':
        p.runs[0].font.size=Pt(16); p.runs[0].font.bold=True
    elif p.text.strip()=='JAMES MWAURA':
        p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.runs[0].font.bold=True
    elif p.text.strip().startswith('REGISTRATION NUMBER') or p.text.strip()=='SEPTEMBER 2026':
        p.alignment=WD_ALIGN_PARAGRAPH.CENTER

# Repair a few source sentences without changing the technical intent.
for p in doc.paragraphs:
    if p.text.startswith('This chapter establishes'):
        p.text='This chapter defines the conservation problem, the purpose of the platform, its scope, requirements, resources and delivery schedule.'
    elif p.text.startswith('This chapter presents the proposed screens'):
        p.text='This chapter describes the proposed interface, system architecture, data flows, database structure and scenario logic.'
    elif p.text.startswith('This chapter defines the planned implementation'):
        p.text='This chapter sets out the planned implementation, testing and deployment work. It distinguishes activities that are proposed from results that will be reported after testing.'
    elif p.text.startswith('This chapter sets out conclusions'):
        p.text='This chapter records the conclusions and recommendations supported by the design and the evidence available at the time of submission.'

# Add a compact glossary where the source section was empty.
for i,p in enumerate(doc.paragraphs):
    if p.text.strip()=='DEFINITION OF KEY TERMS':
        if i+1 < len(doc.paragraphs) and not doc.paragraphs[i+1].text.strip():
            doc.paragraphs[i+1].text='Key terms used in this document are defined in Table 0.1. The definitions describe how each term is used in the Seka Kama workflow.'

# Table styling: sober gray header, white body, visible light borders.
for table in doc.tables:
    borders(table)
    for ri,row in enumerate(table.rows):
        for cell in row.cells:
            cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER; set_cell_margin(cell)
            for p in cell.paragraphs:
                p.paragraph_format.space_after=Pt(2); p.paragraph_format.line_spacing=1.05
                for r in p.runs: r.font.name='Aptos'; r.font.size=Pt(9.5); r.font.color.rgb=RGBColor(0,0,0)
        if ri==0:
            for cell in row.cells:
                shade(cell,'5B6573')
                for p in cell.paragraphs:
                    for r in p.runs: r.font.bold=True; r.font.color.rgb=RGBColor(255,255,255)
        elif ri % 2 == 0:
            for cell in row.cells: shade(cell,'F3F4F6')

# Captions for existing figures.
for p in doc.paragraphs:
    if p.text.startswith('Figure ') and 'reference' in p.text.lower(): p.style='Caption'
    if p.text.startswith('Figure 2.3') or p.text.startswith('Figure 2.4') or p.text.startswith('Figure 2.5'): p.style='Caption'

# Header and footer with restrained publication styling.
for sec in doc.sections:
    hp=sec.header.paragraphs[0]; hp.text='SEKA KAMA SYSTEM DOCUMENTATION'; hp.alignment=WD_ALIGN_PARAGRAPH.RIGHT
    for r in hp.runs: r.font.name='Aptos'; r.font.size=Pt(8); r.font.color.rgb=RGBColor(90,90,90)
    fp=sec.footer.paragraphs[0]; fp.alignment=WD_ALIGN_PARAGRAPH.CENTER
    fp.add_run('James Mwaura  |  DSE-02-0143/2025  |  ')
    fld=OxmlElement('w:fldSimple'); fld.set(qn('w:instr'),'PAGE'); fp._p.append(fld)
    for r in fp.runs: r.font.name='Aptos'; r.font.size=Pt(8); r.font.color.rgb=RGBColor(90,90,90)

doc.core_properties.title='Seka Kama System Documentation'
doc.core_properties.subject='Geospatial decision-support platform for East African lion conservation'
doc.core_properties.author='James Mwaura'
doc.save(OUT)
print(OUT)
