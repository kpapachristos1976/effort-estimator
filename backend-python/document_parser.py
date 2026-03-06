import os
import re

def parse_document(filepath):
    """Parse PDF or DOCX document and extract relevant information."""
    ext = os.path.splitext(filepath)[1].lower()
    
    if ext == '.pdf':
        text = extract_pdf_text(filepath)
    elif ext in ['.docx', '.doc']:
        text = extract_docx_text(filepath)
    else:
        raise ValueError(f'Unsupported file type: {ext}')
    
    return analyze_text(text)

def extract_pdf_text(filepath):
    """Extract text from PDF file."""
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(filepath)
        text = ''
        for page in reader.pages:
            text += page.extract_text() or ''
        return text
    except Exception as e:
        raise Exception(f'Error reading PDF: {str(e)}')

def extract_docx_text(filepath):
    """Extract text from DOCX file."""
    try:
        from docx import Document
        doc = Document(filepath)
        text = '\n'.join([para.text for para in doc.paragraphs])
        return text
    except Exception as e:
        raise Exception(f'Error reading DOCX: {str(e)}')

def analyze_text(text):
    """Analyze document text to extract impacted areas and component counts."""
    text_lower = text.lower()
    
    # Detect impacted areas
    impacted_areas = []
    
    area_keywords = {
        'DWH': ['dwh', 'data warehouse', 'datawarehouse', 'warehouse'],
        'MTII': ['mtii', 'mt2', 'market risk', 'trading'],
        'Moodys': ['moody', 'moodys', "moody's", 'rating', 'credit risk']
    }
    
    for area, keywords in area_keywords.items():
        if any(kw in text_lower for kw in keywords):
            impacted_areas.append(area)
    
    # Extract component counts using patterns
    component_counts = {
        'tables': 0,
        'fields': 0,
        'packages': 0,
        'reports': 0,
        'interfaces': 0
    }
    
    # Pattern matching for counts
    patterns = {
        'tables': [
            r'(\d+)\s*(?:new\s+)?tables?',
            r'tables?\s*[:\-]?\s*(\d+)',
            r'(\d+)\s*database\s+tables?'
        ],
        'fields': [
            r'(\d+)\s*(?:new\s+)?fields?',
            r'fields?\s*[:\-]?\s*(\d+)',
            r'(\d+)\s*(?:data\s+)?columns?'
        ],
        'packages': [
            r'(\d+)\s*(?:new\s+)?packages?',
            r'packages?\s*[:\-]?\s*(\d+)',
            r'(\d+)\s*(?:pl/?sql\s+)?modules?'
        ],
        'reports': [
            r'(\d+)\s*(?:new\s+)?reports?',
            r'reports?\s*[:\-]?\s*(\d+)'
        ],
        'interfaces': [
            r'(\d+)\s*(?:new\s+)?interfaces?',
            r'interfaces?\s*[:\-]?\s*(\d+)',
            r'(\d+)\s*(?:api\s+)?endpoints?'
        ]
    }
    
    for component, pattern_list in patterns.items():
        for pattern in pattern_list:
            matches = re.findall(pattern, text_lower)
            if matches:
                component_counts[component] = max(component_counts[component], max(int(m) for m in matches))
    
    # Detect complexity
    complexity = 'medium'
    
    high_complexity_indicators = [
        'complex', 'complicated', 'challenging', 'critical',
        'high risk', 'significant changes', 'major', 'extensive'
    ]
    
    low_complexity_indicators = [
        'simple', 'straightforward', 'minor', 'small',
        'low risk', 'minimal changes', 'basic'
    ]
    
    high_count = sum(1 for indicator in high_complexity_indicators if indicator in text_lower)
    low_count = sum(1 for indicator in low_complexity_indicators if indicator in text_lower)
    
    if high_count > low_count + 2:
        complexity = 'high'
    elif low_count > high_count + 2:
        complexity = 'low'
    
    return {
        'impacted_areas': impacted_areas,
        'component_counts': component_counts,
        'complexity': complexity,
        'text_preview': text[:500] + '...' if len(text) > 500 else text
    }
