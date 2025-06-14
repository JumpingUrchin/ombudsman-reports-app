import { useState, useMemo } from 'react';
import { Download, Search, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { TableRow } from '@/lib/types';
import { convertDepartmentCodesToNames, convertReportTypeCodeToDisplayName, getOrganizationNames } from '@/lib/reportProcessor';
import { Translations } from '@/lib/i18n';
import { useLanguage } from '@/lib/useLanguage';

interface ReportsTableProps {
  data: TableRow[];
  onDownloadCSV: (filteredData: TableRow[]) => void;
  translations: Translations;
  originalCsvLinkNode?: React.ReactNode;
}

type SortField = 'Year' | 'Case Reference' | 'Completed on' | 'Report Type' | 'Organizations concerned';
type SortDirection = 'asc' | 'desc';

export default function ReportsTable({ data, onDownloadCSV, translations: t, originalCsvLinkNode }: ReportsTableProps) {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('Completed on');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Convert language code for report type conversion
  const reportTypeLanguage: 'EN' | 'TC' | 'SC' = language === 'zh-HK' ? 'TC' : 'EN';
  
  // Convert language code for organization names
  const organizationLanguage: 'en' | 'tc' | 'sc' = language === 'zh-HK' ? 'tc' : 'en';

  // Get unique values for filters
  const uniqueYears = useMemo(() => {
    const years = data.map(row => row.Year).filter(Boolean);
    return [...new Set(years)].sort();
  }, [data]);

  const uniqueTypes = useMemo(() => {
    const types = data.map(row => {
      const code = row['Report Type'];
      // Pass the whole 'row' to allow checking ChineseSpecificDITerm
      return code ? convertReportTypeCodeToDisplayName(code, reportTypeLanguage, row) : '';
    }).filter(Boolean);
    return [...new Set(types)].sort();
  }, [data, reportTypeLanguage]);

  const uniqueOrgs = useMemo(() => {
    const allOrgs = new Set<string>();
    data.forEach(row => {
      const orgsString = row['Organizations concerned'];
      if (orgsString) {
        // Convert department codes to localized names
        const localizedOrgs = getOrganizationNames(orgsString, organizationLanguage);
        if (localizedOrgs) {
          // Split by comma and clean up each organization name
          const orgs = localizedOrgs.split(',').map(org => org.trim()).filter(org => org.length > 0);
          orgs.forEach(org => allOrgs.add(org));
        }
      }
    });
    return [...allOrgs].sort();
  }, [data, organizationLanguage]);

  // Get unique languages from the data
  const uniqueLanguages = useMemo(() => {
    const languages = new Set<string>();
    data.forEach(row => {
      // Check all language Google Drive links to determine available languages
      if (row['Google Drive Link (EN)']) languages.add('EN');
      if (row['Google Drive Link (TC)']) languages.add('TC');
      if (row['Google Drive Link (SC)']) languages.add('SC');
    });
    return [...languages].sort();
  }, [data]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    // First filter the data
    const filtered = data.filter(row => {
      const matchesSearch = !searchTerm ||
        Object.values(row).some(value =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      const matchesYear = !yearFilter ||
        (yearFilter === 'OTHERS' ? !row.Year : row.Year === yearFilter);
      const matchesType = !typeFilter ||
        (typeFilter === 'OTHERS' ? !row['Report Type'] :
         convertReportTypeCodeToDisplayName(row['Report Type'], reportTypeLanguage, row) === typeFilter);
      
      // Check organization filter with localized names
      const matchesOrg = !orgFilter || (() => {
        const orgsString = row['Organizations concerned'];
        if (!orgsString) return false;
        const localizedOrgs = getOrganizationNames(orgsString, organizationLanguage);
        if (!localizedOrgs) return false;
        return localizedOrgs.split(',').map(org => org.trim()).includes(orgFilter);
      })();
      
      // Check language filter
      const matchesLanguage = !languageFilter || (() => {
        if (languageFilter === 'OTHERS') {
          // Show reports with no Google Drive links in any language
          return !row['Google Drive Link (EN)'] && !row['Google Drive Link (TC)'] && !row['Google Drive Link (SC)'];
        }
        // Check if the selected language has a Google Drive link
        const languageColumnMap = {
          'EN': 'Google Drive Link (EN)',
          'TC': 'Google Drive Link (TC)',
          'SC': 'Google Drive Link (SC)'
        };
        const columnName = languageColumnMap[languageFilter as keyof typeof languageColumnMap];
        return columnName ? !!row[columnName] : false;
      })();
      
      return matchesSearch && matchesYear && matchesType && matchesOrg && matchesLanguage;
    });

    // Then sort the filtered data
    return filtered.sort((a, b) => {
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      
      // Special handling for date fields
      if (sortField === 'Completed on') {
        const aDate = aValue ? new Date(aValue) : new Date(0);
        const bDate = bValue ? new Date(bValue) : new Date(0);
        const comparison = aDate.getTime() - bDate.getTime();
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      
      // String comparison for other fields
      const comparison = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, searchTerm, yearFilter, typeFilter, orgFilter, languageFilter, sortField, sortDirection, reportTypeLanguage, organizationLanguage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default direction
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setYearFilter('');
    setTypeFilter('');
    setOrgFilter('');
    setLanguageFilter('');
  };

  const renderSortableHeader = (field: SortField, label: string, widthClassName: string = '') => {
    const isActive = sortField === field;
    return (
      <th
        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap ${widthClassName}`}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {label}
          {isActive && (
            sortDirection === 'asc'
              ? <ChevronUp className="h-4 w-4" />
              : <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </th>
    );
  };

  // The convertToGoogleDriveDirectLink function is removed as this logic is now handled by the server route.

  const getFileLink = (filePathOrUrl: string | undefined): string | null => {
    if (!filePathOrUrl) return null;
    // Pass the raw path; Next.js router and the server handler will manage it.
    return `/files/${filePathOrUrl}`;
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{t.noDataAvailable}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with download button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {t.reportsTableTitle} ({filteredAndSortedData.length} of {data.length} {t.reportsCount})
        </h2>
        <div className="flex items-center gap-4">
          {originalCsvLinkNode}
          <button
            onClick={() => onDownloadCSV(filteredAndSortedData)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            {t.downloadCSV}
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.year}</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t.allYears}</option>
              {uniqueYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
              <option value="OTHERS">{t.others}</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.reportType}</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t.allTypes}</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
              <option value="OTHERS">{t.others}</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.organizations}</label>
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t.allOrganizations}</option>
              {uniqueOrgs.map(org => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.languageFilter}</label>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t.allLanguages}</option>
              {uniqueLanguages.map(lang => {
                const displayName = lang === 'EN' ? t.english :
                                   lang === 'TC' ? t.traditionalChinese :
                                   lang === 'SC' ? t.simplifiedChinese : lang;
                return (
                  <option key={lang} value={lang}>{displayName}</option>
                );
              })}
              <option value="OTHERS">{t.others}</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {t.clearFilters}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                {renderSortableHeader('Year', t.year)}
                {renderSortableHeader('Report Type', t.reportType, 'w-40')}
                <th
                  className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap w-16"
                  onClick={() => handleSort('Case Reference')}
                >
                  <div className="flex items-center gap-1">
                    {t.caseReference}
                    {sortField === 'Case Reference' && (
                      sortDirection === 'asc'
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-1/5">
                  {t.titleTC}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-1/5">
                  {t.titleEN}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-1/5">
                  {t.titleCN}
                </th>
                {renderSortableHeader('Organizations concerned', t.organizations, 'w-64')}
                {renderSortableHeader('Completed on', t.completedOn)}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row.Year}
                  </td>
                  <td className="px-6 py-4 whitespace-normal break-words text-sm text-gray-900 w-40"> {/* Increased from w-32 */}
                    {convertReportTypeCodeToDisplayName(row['Report Type'], reportTypeLanguage, row)}
                  </td>
                  <td className="px-2 py-4 text-sm text-gray-900 w-16 break-words"> {/* Set width to w-16 */}
                    {row['Case Reference']}
                  </td>
                  {/* Title (TC) with link and wrapping */}
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-normal break-words w-1/5" title={row['Title in Traditional Chinese']}>
                    {getFileLink(row['File Path (Traditional Chinese)']) ? (
                      <a
                        href={getFileLink(row['File Path (Traditional Chinese)'])!}
                        className="text-blue-600 hover:text-blue-900 transition-colors flex items-center gap-1"
                      >
                        <Download className="h-3 w-3 flex-shrink-0" />
                        {row['Title in Traditional Chinese']}
                      </a>
                    ) : (
                      row['Title in Traditional Chinese']
                    )}
                  </td>
                  {/* Title (EN) with link and wrapping */}
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-normal break-words w-1/5" title={row['Title in English']}>
                    {getFileLink(row['File Path (English)']) ? (
                      <a
                        href={getFileLink(row['File Path (English)'])!}
                        className="text-blue-600 hover:text-blue-900 transition-colors flex items-center gap-1"
                      >
                        <Download className="h-3 w-3 flex-shrink-0" />
                        {row['Title in English']}
                      </a>
                    ) : (
                      row['Title in English']
                    )}
                  </td>
                  {/* Title (CN) with link and wrapping */}
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-normal break-words w-1/5" title={row['Title in Simplified Chinese']}>
                    {getFileLink(row['File Path (Simplified Chinese)']) ? (
                      <a
                        href={getFileLink(row['File Path (Simplified Chinese)'])!}
                        className="text-blue-600 hover:text-blue-900 transition-colors flex items-center gap-1"
                      >
                        <Download className="h-3 w-3 flex-shrink-0" />
                        {row['Title in Simplified Chinese']}
                      </a>
                    ) : (
                      row['Title in Simplified Chinese']
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-normal break-words w-64" title={getOrganizationNames(row['Organizations concerned'], organizationLanguage) || row['Organizations concerned']}> {/* Increased from w-48 */}
                    {getOrganizationNames(row['Organizations concerned'], organizationLanguage) || row['Organizations concerned']}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row['Completed on']}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredAndSortedData.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">{t.noMatchingReports}</p>
        </div>
      )}
    </div>
  );
}