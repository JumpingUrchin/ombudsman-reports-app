'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse'; // Keep for client-side download generation
import ReportsTable from '@/components/ReportsTable';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { TableRow } from '@/lib/types';
import { useLanguage } from '@/lib/useLanguage';
import { AlertCircle, CheckCircle, Download } from 'lucide-react';

interface ReportsPageClientProps {
  initialTableData: TableRow[];
  initialError: string | null;
  locale?: 'en' | 'zh-HK';
  ssrFallback?: React.ReactNode;
}

export default function ReportsPageClient({ initialTableData, initialError, locale, ssrFallback }: ReportsPageClientProps) {
  const { language, changeLanguage, t } = useLanguage(locale);
  const [tableData, setTableData] = useState<TableRow[]>(initialTableData);
  const [error, setError] = useState<string | null>(initialError);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark as client-side after hydration
    setIsClient(true);
    setTableData(initialTableData);
    setError(initialError);
  }, [initialTableData, initialError]);

  // Show SSR fallback during server-side rendering and before client hydration
  if (!isClient && ssrFallback) {
    return <>{ssrFallback}</>;
  }

  const handleDownloadCSV = (filteredData: TableRow[]) => {
    if (filteredData.length === 0) return;

    const headers = Object.keys(filteredData[0]);
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row =>
        headers.map(header => {
          const value = row[header as keyof TableRow] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reports_table_filtered_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const originalCsvLinkNode = (tableData.length > 0 && !error) ? (
    <a
      href="reports_table.csv"
      download="reports_table_original.csv"
      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
    >
      <Download className="h-4 w-4" />
      {t.downloadOriginalCSV}
    </a>
  ) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t.title}
              </h1>
              <p className="text-gray-600">
                {t.subtitle}
              </p>
            </div>
            <LanguageSwitcher
              currentLanguage={language}
              onLanguageChange={changeLanguage}
            />
          </div>
        </div>

        {/* Archive Introduction Section */}
        <div className="mb-8 bg-white rounded-lg border p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t.archiveTitle}
          </h2>
          <div className="prose max-w-none text-gray-700 space-y-4">
            <div className="whitespace-pre-line">
              {t.archiveDescription}
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t.fullTextSearchTitle}
              </h3>
              <p className="text-gray-700">
                {language === 'zh-HK' ? (
                  <>
                    所有檔案均經人工智能整理並進行了光學字符識別（OCR）處理，以便於搜尋。使用者亦可前往此{' '}
                    <a
                      href="https://journaliststudio.google.com/pinpoint/search?collection=d01fe5c6ae6170f7&utm_source=collection_publish_link"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Pinpoint 鏡像文件庫
                    </a>
                    {' '}進行全文搜尋。使用者可使用{' '}
                    <a
                      href="http://bit.ly/AllTheOperators"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Google Boolean Search Operators
                    </a>
                    {' '}協助精準搜尋。
                  </>
                ) : (
                  <>
                    The files have been organized and processed for OCR using artificial intelligence to facilitate searching. Users can also perform full-text searches within this archive&apos;s{' '}
                    <a
                      href="https://journaliststudio.google.com/pinpoint/search?collection=d01fe5c6ae6170f7&utm_source=collection_publish_link"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Pinpoint library
                    </a>
                    .{' '}
                    <a
                      href="http://bit.ly/AllTheOperators"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Google Boolean Search Operators
                    </a>
                    {' '}can be used to refine searches for greater accuracy.
                  </>
                )}
              </p>
            </div>
            
            <div className="text-sm text-gray-600 border-t pt-4">
              <p className="mb-2">
                {language === 'zh-HK' ? (
                  <>
                    請注意文件庫可能存在遺漏，部分檔案名稱也可能出現錯誤，敬請見諒。如欲回報錯誤或建議增補文件，請前往此{' '}
                    <a
                      href="https://github.com/JumpingUrchin/ombudsman-reports-app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Github Repository
                    </a>
                    {' '}留言。
                  </>
                ) : (
                  <>
                    Please note that there may be omissions in the document library, and some file names may contain errors. We apologize for any inconvenience. Please visit this{' '}
                    <a
                      href="https://github.com/JumpingUrchin/ombudsman-reports-app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Github Repository
                    </a>
                    {' '}to report errors or suggest additional documents.
                  </>
                )}
              </p>
              <p className="italic">{t.lastUpdated}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{t.error}</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reports Table - show if data is available */}
        {tableData.length > 0 && !error && (
          <ReportsTable
            data={tableData}
            onDownloadCSV={handleDownloadCSV}
            translations={t}
            originalCsvLinkNode={originalCsvLinkNode}
          />
        )}

        {/* No Data State - show if no data and no error */}
        {tableData.length === 0 && !error && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">{t.noDataAvailable}</h2>
            <div className="prose text-sm text-gray-600">
              <p>
                {t.noDataMessage}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}