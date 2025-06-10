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
  ssrFallback?: React.ReactNode;
}

export default function ReportsPageClient({ initialTableData, initialError, ssrFallback }: ReportsPageClientProps) {
  const { language, changeLanguage, t } = useLanguage();
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