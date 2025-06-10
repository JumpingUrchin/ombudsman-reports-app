// This is now a Server Component with locale support
import Papa from 'papaparse';
import fs from 'fs/promises';
import path from 'path';
import ReportsPageClient from '@/components/ReportsPageClient';
import ReportsTableSSR from '@/components/ReportsTableSSR';
import LanguageSwitcherSSR from '@/components/LanguageSwitcherSSR';
import { TableRow } from '@/lib/types';
import { getTranslations, Language } from '@/lib/i18n';
import { AlertCircle, Download } from 'lucide-react';
import { notFound } from 'next/navigation';

async function getTableData(): Promise<{ data: TableRow[]; error: string | null }> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'reports_table.csv');
    const csvText = await fs.readFile(filePath, 'utf-8');
    
    return new Promise((resolve) => {
      Papa.parse<TableRow>(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV parsing warnings on server:', results.errors);
          }
          console.log(`Loaded ${results.data.length} reports from CSV (server-side)`);
          resolve({ data: results.data, error: null });
        },
        error: (error: any) => {
          console.error('CSV parsing error on server:', error);
          resolve({ data: [], error: `Error parsing CSV on server: ${error.message}` });
        }
      });
    });
  } catch (fetchError) {
    console.error('Error loading CSV on server:', fetchError);
    return { data: [], error: `Error loading CSV file on server: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}` };
  }
}

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

// Generate static params for supported locales
export async function generateStaticParams() {
  return [
    { locale: 'en' },
    { locale: 'zh-HK' }
  ];
}

export async function generateMetadata({ params }: LocalePageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as Language;
  
  // Validate locale
  if (!['en', 'zh-HK'].includes(locale)) {
    notFound();
  }
  
  const t = getTranslations(locale);
  
  return {
    title: t.title,
    description: t.subtitle,
    alternates: {
      languages: {
        'en': '/en',
        'zh-HK': '/zh-HK',
      },
    },
  };
}

export default async function LocalePage({ params }: LocalePageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as Language;
  
  // Validate locale
  if (!['en', 'zh-HK'].includes(locale)) {
    notFound();
  }
  
  const { data: initialTableData, error: initialError } = await getTableData();
  const t = getTranslations(locale);

  return (
    <ReportsPageClient
      initialTableData={initialTableData}
      initialError={initialError}
      locale={locale}
      ssrFallback={
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
                <LanguageSwitcherSSR
                  currentLanguage={locale}
                />
              </div>
            </div>

            {initialError && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{t.error}</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{initialError}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SSR Table for SEO - shows all data initially */}
            {initialTableData.length > 0 && !initialError && (
              <div className="space-y-6">
                {/* Header for SSR table */}
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {t.reportsTableTitle} ({initialTableData.length} {t.reportsCount})
                  </h2>
                  <div className="flex items-center gap-4">
                    <a
                      href="/reports_table.csv"
                      download="reports_table_original.csv"
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      {t.downloadOriginalCSV}
                    </a>
                  </div>
                </div>

                {/* SSR Table for SEO */}
                <ReportsTableSSR
                  data={initialTableData}
                  translations={t}
                  language={locale}
                />
              </div>
            )}

            {/* No Data State - show if no data and no error */}
            {initialTableData.length === 0 && !initialError && (
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
      }
    />
  );
}