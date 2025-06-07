'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import ReportsTable from '@/components/ReportsTable';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { TableRow } from '@/lib/types';
import { useLanguage } from '@/lib/useLanguage';
import { AlertCircle, CheckCircle, Download } from 'lucide-react';

export default function Home() {
  const { language, changeLanguage, t } = useLanguage();
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load CSV data on client-side
  useEffect(() => {
    const loadCSVData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/reports_table.csv');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        
        Papa.parse<TableRow>(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              console.warn('CSV parsing warnings:', results.errors);
            }
            
            setTableData(results.data);
            console.log(`Loaded ${results.data.length} reports from CSV (client-side)`);
            setIsLoading(false);
          },
          error: (error: any) => {
            console.error('CSV parsing error:', error);
            setError(`Error parsing CSV: ${error.message}`);
            setIsLoading(false);
          }
        });
      } catch (fetchError) {
        console.error('Error loading CSV:', fetchError);
        setError(`Error loading CSV file: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    };

    loadCSVData();
  }, []);

  const handleDownloadCSV = (filteredData: TableRow[]) => {
    if (filteredData.length === 0) return;

    // Convert filtered table data to CSV
    const headers = Object.keys(filteredData[0]);
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row =>
        headers.map(header => {
          const value = row[header as keyof TableRow] || '';
          // Escape commas and quotes in CSV values
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    // Create and trigger download
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

  const handleDownloadFile = (googleDriveLink: string, fileLanguage: string) => {
    if (!googleDriveLink) {
      alert(`${t.noFilePathAvailable} ${fileLanguage} version.`);
      return;
    }

    // Convert Google Drive share links to direct download links if needed
    let directLink = googleDriveLink;
    
    // Convert Google Drive share links to direct download format
    // Example: https://drive.google.com/file/d/FILE_ID/view -> https://drive.google.com/uc?id=FILE_ID
    const fileIdMatch = googleDriveLink.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch) {
      const fileId = fileIdMatch[1];
      directLink = `https://drive.google.com/uc?id=${fileId}`;
    }
    
    // Open the Google Drive link directly in a new tab
    // This allows users to view/download the file from Google Drive
    window.open(directLink, '_blank', 'noopener,noreferrer');
  };

  const originalCsvLinkNode = (tableData.length > 0 && !error) ? (
    <a
      href="/reports_table.csv"
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

        {/* Error Alert */}
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

        {/* Loading State */}
        {isLoading && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-blue-400 animate-spin" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">{t.loading}</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>{t.loadingMessage}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reports Table */}
        {!isLoading && tableData.length > 0 && (
          <ReportsTable
            data={tableData}
            onDownloadCSV={handleDownloadCSV}
            onDownloadFile={handleDownloadFile}
            translations={t}
            originalCsvLinkNode={originalCsvLinkNode}
          />
        )}

        {/* No Data State */}
        {!isLoading && tableData.length === 0 && !error && (
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