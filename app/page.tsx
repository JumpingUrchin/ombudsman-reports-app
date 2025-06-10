// This is now a Server Component
import Papa from 'papaparse';
import fs from 'fs/promises';
import path from 'path';
import ReportsPageClient from '@/components/ReportsPageClient'; // Import the new client component
import { TableRow } from '@/lib/types';

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
            // Optionally, you could decide to return an error or partial data
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

export default async function Home() {
  const { data: initialTableData, error: initialError } = await getTableData();

  return (
    <ReportsPageClient
      initialTableData={initialTableData}
      initialError={initialError}
    />
  );
}
