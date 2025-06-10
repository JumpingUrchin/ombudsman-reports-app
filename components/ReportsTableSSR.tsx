import { TableRow } from '@/lib/types';
import { convertReportTypeCodeToDisplayName, getOrganizationNames } from '@/lib/reportProcessor';
import { Translations } from '@/lib/i18n';
import { Download } from 'lucide-react';

interface ReportsTableSSRProps {
  data: TableRow[];
  translations: Translations;
  language: 'en' | 'zh-HK';
}

export default function ReportsTableSSR({ data, translations: t, language }: ReportsTableSSRProps) {
  // Convert language code for report type conversion
  const reportTypeLanguage: 'EN' | 'TC' | 'SC' = language === 'zh-HK' ? 'TC' : 'EN';
  
  // Convert language code for organization names
  const organizationLanguage: 'en' | 'tc' | 'sc' = language === 'zh-HK' ? 'tc' : 'en';

  const getFileLink = (filePathOrUrl: string | undefined): string | null => {
    if (!filePathOrUrl) return null;
    return `/files/${filePathOrUrl}`;
  };

  // Sort data by completion date (newest first) for initial SEO render
  const sortedData = [...data].sort((a, b) => {
    const aDate = a['Completed on'] ? new Date(a['Completed on']) : new Date(0);
    const bDate = b['Completed on'] ? new Date(b['Completed on']) : new Date(0);
    return bDate.getTime() - aDate.getTime();
  });

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{t.noDataAvailable}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                {t.year}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-40">
                {t.reportType}
              </th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-16">
                {t.caseReference}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-64">
                {t.organizations}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                {t.completedOn}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.Year}
                </td>
                <td className="px-6 py-4 whitespace-normal break-words text-sm text-gray-900 w-40">
                  {convertReportTypeCodeToDisplayName(row['Report Type'], reportTypeLanguage, row)}
                </td>
                <td className="px-2 py-4 text-sm text-gray-900 w-16 break-words">
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
                <td className="px-6 py-4 text-sm text-gray-900 whitespace-normal break-words w-64" title={getOrganizationNames(row['Organizations concerned'], organizationLanguage) || row['Organizations concerned']}>
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
  );
}