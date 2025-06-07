import { DEPARTMENT_CODES, ReportInfo, TableRow, CSVRow } from './types';

export function validateCaseReference(reportNumber?: string): string | null {
  if (!reportNumber) return null;
  
  // Check if report number starts with valid prefixes
  if (reportNumber.toUpperCase().startsWith('OMB')) {
    // Normalize: ensure space after OMB if followed immediately by digits
    const normalized = reportNumber.replace(/^OMB(\d)/, 'OMB $1');
    return normalized;
  } else if (reportNumber.toUpperCase().startsWith('CAC') || reportNumber.toUpperCase().startsWith('OCAC')) {
    return reportNumber;
  } else {
    console.warn(`Invalid report number format: '${reportNumber}' (doesn't start with OMB/CAC/OCAC)`);
    return null;
  }
}

export function parseCaseReference(reportNumber?: string): { caseRef: string | null; year: string | null } {
  const validated = validateCaseReference(reportNumber);
  if (!validated) return { caseRef: null, year: null };
  
  // Pattern for OMB format: OMB/DI/449
  const ombMatch = validated.match(/OMB[/]([A-Z]+)[/](\d+)/);
  if (ombMatch) {
    return { caseRef: `OMB/${ombMatch[1]}/${ombMatch[2]}`, year: null };
  }
  
  // Pattern for year format: OMB 1997/2136
  const yearMatch = validated.match(/OMB\s(\d{4})[/](\d+)/);
  if (yearMatch) {
    return { caseRef: `OMB ${yearMatch[1]}/${yearMatch[2]}`, year: yearMatch[1] };
  }
  
  // Pattern for CAC format: CAC/WP/14/1 S.F. 15
  const cacMatch = validated.match(/CAC[/]WP[/]14[/]1\s+S\.?F\.?\s+(\d+)/);
  if (cacMatch) {
    return { caseRef: `CAC/WP/14/1 S.F. ${cacMatch[1]}`, year: null };
  }
  
  // Pattern for OCAC format: return as-is
  if (validated.toUpperCase().startsWith('OCAC')) {
    return { caseRef: validated, year: null };
  }
  
  return { caseRef: validated, year: null };
}

export function validateDepartmentCode(deptCode?: string): string | null {
  if (!deptCode) return null;
  
  // Filter out OMB department code
  if (deptCode === "OMB") {
    console.warn("Filtering out useless department code 'OMB' (all documents are from Ombudsman)");
    return null;
  }
  
  // Validate against standardized list
  if (deptCode in DEPARTMENT_CODES) {
    console.log(`Validated department code: '${deptCode}' (${DEPARTMENT_CODES[deptCode]})`);
    return deptCode;
  } else {
    console.warn(`Unknown department code: '${deptCode}' (not in standardized list)`);
    return deptCode;
  }
}

export function extractYearFromPath(filePath: string): string | null {
  // Look for year patterns in path (1994-2024 range)
  const yearMatch = filePath.match(/(19\d{2}|20[0-2]\d)/);
  return yearMatch ? yearMatch[1] : null;
}

export function extractFinancialYear(yearStr?: string, dateStr?: string): string | null {
  if (!yearStr) return null;
  
  try {
    const year = parseInt(yearStr);
    // Hong Kong financial year runs April to March
    if (dateStr) {
      try {
        const dateObj = new Date(dateStr.replace('Z', '+00:00'));
        if (dateObj.getMonth() >= 3) { // April onwards = current FY (month is 0-indexed)
          return `${year}/${String(year + 1).slice(-2)}`;
        } else { // Jan-Mar = previous FY
          return `${year - 1}/${String(year).slice(-2)}`;
        }
      } catch {
        // Ignore date parsing errors
      }
    }
    
    // Default: assume it's the start of the financial year
    return `${year}/${String(year + 1).slice(-2)}`;
  } catch {
    return yearStr;
  }
}

export function convertDepartmentCodesToNames(departmentCodes?: string, language: 'en' | 'tc' | 'sc' = 'en'): string | null {
  if (!departmentCodes) return null;
  
  // Split by comma and convert each code to full name in the specified language
  const codes = departmentCodes.split(',').map(code => code.trim()).filter(code => code.length > 0);
  const names = codes.map(code => {
    if (code in DEPARTMENT_CODES) {
      return DEPARTMENT_CODES[code][language];
    }
    // If code not found, return it as-is (might already be a full name)
    return code;
  });
  
  return names.join(', ');
}

// Utility function to get organization names based on language preference
export function getOrganizationNames(departmentCodes?: string, language: 'en' | 'tc' | 'sc' = 'en'): string | null {
  return convertDepartmentCodesToNames(departmentCodes, language);
}

// Report Type Translations (from rename_pdfs_with_ai.py TRANSLATIONS)
// Adding specific DI terms. The main 'DI' can serve as a fallback.
const REPORT_TYPE_TRANSLATIONS = {
  "DI": { // Fallback DI
    "EN": "Direct Investigation",
    "TC": "主動調查", // Default to 主動調查 if specific term not found
    "SC": "主动调查"
  },
  "DI_ZHU": { // 主動調查
    "EN": "Direct Investigation",
    "TC": "主動調查",
    "SC": "主动调查"
  },
  "DI_ZHI": { // 直接調查
    "EN": "Direct Investigation",
    "TC": "直接調查",
    "SC": "直接调查"
  },
  "FI": {
    "EN": "Full Investigation",
    "TC": "全面調查",
    "SC": "全面调查"
  },
  "Code": {
    "EN": "Code",
    "TC": "公開資料守則投訴調查",
    "SC": "公开资料守则投诉调查"
  },
  "Complaint": {
    "EN": "Investigation Report",
    "TC": "就投訴作出的調查",
    "SC": "就投诉作出的调查"
  },
  "AR": {
    "EN": "Annual Report",
    "TC": "年報",
    "SC": "年报"
  },
  "OmbudsNews": {
    "EN": "OmbudsNews",
    "TC": "申報",
    "SC": "申报"
  }
};

export function convertReportTypeCodeToDisplayName(reportTypeCode?: string, language: 'EN' | 'TC' | 'SC' = 'EN', row?: TableRow): string {
  if (!reportTypeCode) return '';

  let finalReportTypeCode = reportTypeCode;

  if (reportTypeCode === 'DI' && row?.ChineseSpecificDITerm) {
    if (row.ChineseSpecificDITerm === '主動調查') {
      finalReportTypeCode = 'DI_ZHU';
    } else if (row.ChineseSpecificDITerm === '直接調查') {
      finalReportTypeCode = 'DI_ZHI';
    }
    // If ChineseSpecificDITerm is something else, it will fall back to the generic 'DI'
  }
  
  const translations = REPORT_TYPE_TRANSLATIONS[finalReportTypeCode as keyof typeof REPORT_TYPE_TRANSLATIONS];
  
  // If specific (DI_ZHU/DI_ZHI) not found, try fallback generic 'DI'
  if (!translations && (finalReportTypeCode === 'DI_ZHU' || finalReportTypeCode === 'DI_ZHI')) {
    const fallbackTranslations = REPORT_TYPE_TRANSLATIONS['DI'];
    if (fallbackTranslations) {
      return fallbackTranslations[language] || fallbackTranslations.EN || reportTypeCode;
    }
  }
  
  if (!translations) return reportTypeCode; // Return original code as-is if no translation found
  
  return translations[language] || translations.EN || reportTypeCode;
}

export function processLogs(csvData: CSVRow[], resultsDir: string): ReportInfo[] {
  const reports: ReportInfo[] = [];
  
  for (const row of csvData) {
    if (row.status !== 'SUCCESS') continue;
    if (!row.ai_response_json) continue;
    
    try {
      const aiData = JSON.parse(row.ai_response_json);
      
      // Extract file path relative to results directory
      let relPath = row.new_symlink_path_or_error || '';
      if (relPath && resultsDir) {
        try {
          // Simple path processing - remove results directory prefix
          const resultsIndex = relPath.indexOf(resultsDir);
          if (resultsIndex !== -1) {
            relPath = relPath.substring(resultsIndex + resultsDir.length + 1);
          }
        } catch {
          // Keep original path if processing fails
        }
      }
      
      // Extract and validate case reference
      const reportNumber = aiData.report_number;
      const validatedReportNumber = validateCaseReference(reportNumber);
      const caseRefDisplay = validatedReportNumber ? reportNumber : null;
      const caseRefGrouping = validatedReportNumber || null;
      
      // Use AI-extracted financial year or fall back to date-based calculation
      let financialYear = aiData.financial_year;
      if (!financialYear) {
        const dateCompleted = aiData.date_completed || aiData.date || '';
        const extractedYear = extractYearFromPath(relPath) || (dateCompleted.length >= 4 ? dateCompleted.slice(0, 4) : '');
        financialYear = extractFinancialYear(extractedYear, dateCompleted);
      }
      
      // Extract titles and language
      const coreTitle = aiData.core_title || '';
      const language = aiData.language || '';
      
      // Extract organizations involved (using department codes directly)
      let organizations = aiData.organizations_involved;
      if (!organizations) {
        // Fall back to department_code if organizations_involved is not available
        const deptCode = aiData.department_code;
        const validatedDeptCode = validateDepartmentCode(deptCode);
        if (validatedDeptCode) {
          organizations = validatedDeptCode; // Use code directly, not full name
        }
      }
      
      const reportInfo: ReportInfo = {
        year: financialYear,
        case_reference: caseRefDisplay,
        case_reference_grouping: caseRefGrouping || undefined,
        title: coreTitle,
        language: language,
        organizations: organizations,
        date_declared: aiData.date_declared,
        date_completed: aiData.date_completed || aiData.date,
        report_type: aiData.report_type_code,
        file_path: relPath,
        report_number_raw: reportNumber,
        ai_data: aiData
      };
      
      reports.push(reportInfo);
    } catch (error) {
      console.warn('Failed to parse AI response JSON:', error);
      continue;
    }
  }
  
  return reports;
}

export function groupByCaseReference(reports: ReportInfo[]): Record<string, ReportInfo[]> {
  const grouped: Record<string, ReportInfo[]> = {};
  
  for (const report of reports) {
    const caseRefGrouping = report.case_reference_grouping;
    if (caseRefGrouping) {
      // Use the pre-normalized grouping reference
      const normalizedRef = caseRefGrouping.replace(/[/\s]+/g, '_').toUpperCase();
      if (!grouped[normalizedRef]) grouped[normalizedRef] = [];
      grouped[normalizedRef].push(report);
    } else {
      // For reports without case reference, group by title similarity
      const titleKey = `NO_REF_${report.title.slice(0, 20)}`;
      if (!grouped[titleKey]) grouped[titleKey] = [];
      grouped[titleKey].push(report);
    }
  }
  
  return grouped;
}

export function createReportsTable(reports: ReportInfo[]): TableRow[] {
  const groupedReports = groupByCaseReference(reports);
  const tableRows: TableRow[] = [];
  
  for (const [caseRef, reportGroup] of Object.entries(groupedReports)) {
    // Sort by language to prioritize English, then Traditional Chinese, then Simplified
    const langPriority: Record<string, number> = { 'EN': 0, 'TC': 1, 'SC': 2 };
    reportGroup.sort((a, b) => (langPriority[a.language] || 3) - (langPriority[b.language] || 3));
    
    // Find English, Traditional Chinese, and Simplified Chinese versions
    const englishReport = reportGroup.find(r => r.language === 'EN');
    const traditionalChineseReport = reportGroup.find(r => r.language === 'TC');
    const simplifiedChineseReport = reportGroup.find(r => r.language === 'SC');
    
    // Use the first report as base, prefer English if available, then TC, then SC
    const baseReport = englishReport || traditionalChineseReport || simplifiedChineseReport || reportGroup[0];
    
    const row: TableRow = {
      'Year': baseReport.year || '',
      'Case Reference': baseReport.case_reference || '',
      'Title in English': englishReport?.title || '',
      'Title in Traditional Chinese': traditionalChineseReport?.title || '',
      'Title in Simplified Chinese': simplifiedChineseReport?.title || '',
      'Organizations concerned': convertDepartmentCodesToNames(baseReport.organizations, 'en') || '',
      'Declared on': baseReport.date_declared || '',
      'Completed on': baseReport.date_completed || '',
      'File Path (English)': englishReport?.file_path || '',
      'File Path (Traditional Chinese)': traditionalChineseReport?.file_path || '',
      'File Path (Simplified Chinese)': simplifiedChineseReport?.file_path || '',
      'Report Type': baseReport.report_type || '',
      // Add ChineseSpecificDITerm to the TableRow data if it exists on baseReport
      // baseReport is of type ReportInfo which should now include direct_investigation_term
      'ChineseSpecificDITerm': (baseReport as any).direct_investigation_term || ''
    };
    
    tableRows.push(row);
  }
  
  // Note: Sorting is now handled in the ReportsTable component
  
  return tableRows;
}