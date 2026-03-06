import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

const AREA_KEYWORDS = {
  DWH: ['data warehouse', 'dwh', 'etl', 'data mart', 'staging', 'dimension', 'fact table'],
  MTII: ['mtii', 'market data', 'trading', 'instrument', 'pricing', 'valuation'],
  "Moody's": ['moody', 'rating', 'credit', 'analytics', 'risk assessment']
};

const COMPONENT_PATTERNS = {
  file_extracts: [/file extract/gi, /data extract/gi, /export file/gi, /feed/gi],
  data_models: [/data model/gi, /logical model/gi, /physical model/gi, /entity model/gi],
  tables: [/(\d+)\s*table/gi, /table[s]?\s*[:=]?\s*(\d+)/gi, /create table/gi],
  fields: [/(\d+)\s*field/gi, /field[s]?\s*[:=]?\s*(\d+)/gi, /(\d+)\s*column/gi],
  packages: [/package/gi, /stored procedure/gi, /pl\/sql/gi, /function/gi]
};

const COMPLEXITY_INDICATORS = {
  high: ['complex', 'critical', 'multiple systems', 'cross-functional', 'regulatory', 'compliance'],
  low: ['simple', 'straightforward', 'minor', 'small change', 'single']
};

async function extractTextFromPdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

async function extractTextFromDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

export async function parseDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let text = '';

  try {
    if (ext === '.pdf') {
      text = await extractTextFromPdf(filePath);
    } else if (ext === '.docx') {
      text = await extractTextFromDocx(filePath);
    } else {
      throw new Error(`Unsupported file format: ${ext}`);
    }
  } catch (error) {
    console.error('Error parsing document:', error);
    return {
      filename: path.basename(filePath),
      extracted_text: '',
      identified_areas: [],
      identified_components: {},
      complexity: 'normal',
      complexity_indicators: [],
      suggested_impacts: { dwh: false, mtii: false, moodys: false }
    };
  }

  const textLower = text.toLowerCase();

  // Identify areas
  const identified_areas = [];
  for (const [area, keywords] of Object.entries(AREA_KEYWORDS)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        if (!identified_areas.includes(area)) {
          identified_areas.push(area);
        }
        break;
      }
    }
  }

  // Count components
  const identified_components = {};
  for (const [component, patterns] of Object.entries(COMPONENT_PATTERNS)) {
    let count = 0;
    for (const pattern of patterns) {
      const matches = text.match(pattern) || [];
      count += matches.length;
      
      // Try to extract numbers
      for (const match of matches) {
        const nums = match.match(/\d+/);
        if (nums) {
          count = Math.max(count, parseInt(nums[0]));
        }
      }
    }
    identified_components[component] = count > 0 ? Math.max(1, count) : 0;
  }

  // Detect complexity
  let highScore = 0;
  let lowScore = 0;
  const complexity_indicators = [];

  for (const indicator of COMPLEXITY_INDICATORS.high) {
    if (textLower.includes(indicator)) {
      highScore++;
      complexity_indicators.push(`high: ${indicator}`);
    }
  }
  for (const indicator of COMPLEXITY_INDICATORS.low) {
    if (textLower.includes(indicator)) {
      lowScore++;
      complexity_indicators.push(`low: ${indicator}`);
    }
  }

  let complexity = 'normal';
  if (highScore > lowScore) complexity = 'complex';
  else if (lowScore > highScore) complexity = 'low';

  return {
    filename: path.basename(filePath),
    extracted_text: text.substring(0, 2000),
    identified_areas,
    identified_components,
    complexity,
    complexity_indicators,
    suggested_impacts: {
      dwh: identified_areas.includes('DWH'),
      mtii: identified_areas.includes('MTII'),
      moodys: identified_areas.includes("Moody's")
    }
  };
}
