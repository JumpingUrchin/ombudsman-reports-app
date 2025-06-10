import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';
import { TableRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ombudsman-reports.vercel.app';

// Supported locales
const locales = ['en', 'zh-HK'];

async function getAllPDFUrls(): Promise<Array<{ url: string; lastmod: string }>> {
  try {
    const csvFilePath = path.join(process.cwd(), 'public', 'reports_table.csv');
    const csvText = await fs.readFile(csvFilePath, 'utf-8');
    const parseResult = Papa.parse<TableRow>(csvText, { header: true, skipEmptyLines: true });
    
    if (parseResult.errors.length > 0) {
      console.warn('CSV parsing warnings:', parseResult.errors);
    }
    
    const pdfUrls: Array<{ url: string; lastmod: string }> = [];
    
    for (const row of parseResult.data) {
      // Get completion date or default to a fallback date
      const completedDate = row['Completed on'] || row['Declared on'] || '2020-01-01';
      let lastmod = '2020-01-01';
      
      // Parse the date and format for sitemap
      try {
        if (completedDate && completedDate !== '') {
          // Handle various date formats (YYYY, YYYY-MM, YYYY-MM-DD)
          let dateStr = completedDate;
          if (dateStr.length === 4) {
            dateStr += '-12-31'; // Default to end of year
          } else if (dateStr.length === 7) {
            dateStr += '-01'; // Default to first of month
          }
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            lastmod = date.toISOString().split('T')[0];
          }
        }
      } catch (error) {
        console.warn(`Invalid date format for row: ${completedDate}`);
      }
      
      // Add English PDF if it exists
      if (row['File Path (English)']) {
        const encodedPath = row['File Path (English)'].split('/').map(segment => encodeURIComponent(segment)).join('/');
        pdfUrls.push({
          url: `${SITE_URL}/files/${encodedPath}`,
          lastmod
        });
      }
      
      // Add Traditional Chinese PDF if it exists
      if (row['File Path (Traditional Chinese)']) {
        const encodedPath = row['File Path (Traditional Chinese)'].split('/').map(segment => encodeURIComponent(segment)).join('/');
        pdfUrls.push({
          url: `${SITE_URL}/files/${encodedPath}`,
          lastmod
        });
      }
      
      // Add Simplified Chinese PDF if it exists
      if (row['File Path (Simplified Chinese)']) {
        const encodedPath = row['File Path (Simplified Chinese)'].split('/').map(segment => encodeURIComponent(segment)).join('/');
        pdfUrls.push({
          url: `${SITE_URL}/files/${encodedPath}`,
          lastmod
        });
      }
    }
    
    return pdfUrls;
  } catch (error) {
    console.error('Error reading CSV for sitemap:', error);
    return [];
  }
}

export async function GET() {
  try {
    const pdfUrls = await getAllPDFUrls();
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Generate sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <!-- Main pages with internationalization -->
  ${locales.map(locale => `
  <url>
    <loc>${SITE_URL}/${locale}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    ${locales.map(altLocale => `
    <xhtml:link rel="alternate" hreflang="${altLocale}" href="${SITE_URL}/${altLocale}" />`).join('')}
  </url>`).join('')}
  
  <!-- Root redirect page -->
  <url>
    <loc>${SITE_URL}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- PDF files -->
  ${pdfUrls.map(({ url, lastmod }) => `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;

    return new NextResponse(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}