import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';
import { TableRow } from '@/lib/types';
import crypto from 'crypto'; // For generating safe cache filenames

export const dynamic = 'force-dynamic';

const PDF_CACHE_DIR = path.join(process.cwd(), '.cache', 'pdf_files');

// Ensure cache directory exists
async function ensureCacheDirExists() {
  try {
    await fs.mkdir(PDF_CACHE_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create PDF cache directory:', error);
    // Depending on the error, you might want to handle this more gracefully
    // For now, if it fails, caching will likely fail.
  }
}
ensureCacheDirExists(); // Call on module load

const convertToGoogleDriveDirectLink = (googleDriveLink: string): string => {
  const fileIdMatch = googleDriveLink.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileIdMatch) {
    const fileId = fileIdMatch[1];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  if (googleDriveLink.includes('drive.google.com/uc?id=')) {
    const idMatch = googleDriveLink.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
    }
  }
  return googleDriveLink;
};

async function findGoogleDriveLink(filePathFromUrl: string): Promise<string | null> {
  try {
    const csvFilePath = path.join(process.cwd(), 'public', 'reports_table.csv');
    const csvText = await fs.readFile(csvFilePath, 'utf-8');
    const parseResult = Papa.parse<TableRow>(csvText, { header: true, skipEmptyLines: true });
    if (parseResult.errors.length > 0) console.warn('CSV parsing warnings:', parseResult.errors);
    
    const targetPath = decodeURIComponent(filePathFromUrl);
    for (const row of parseResult.data) {
      if (row['File Path (English)'] === targetPath && row['Google Drive Link (EN)']) return row['Google Drive Link (EN)'];
      if (row['File Path (Traditional Chinese)'] === targetPath && row['Google Drive Link (TC)']) return row['Google Drive Link (TC)'];
      if (row['File Path (Simplified Chinese)'] === targetPath && row['Google Drive Link (SC)']) return row['Google Drive Link (SC)'];
    }
    return null;
  } catch (error) {
    console.error('Error reading/parsing CSV for GDrive link:', error);
    return null;
  }
}

// Generates a safe filename for caching, e.g., by hashing the original path
function getCacheKey(filePathFromUrl: string): string {
  // Using SHA256 hash of the original file path to create a unique and safe filename
  // Adding .pdf extension for clarity, though not strictly necessary for serving
  return crypto.createHash('sha256').update(filePathFromUrl).digest('hex') + '.pdf';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { filePath: string[] } }
) {
  const filePathFromUrl = params.filePath.join('/');
  const cacheKey = getCacheKey(filePathFromUrl);
  const cachedFilePath = path.join(PDF_CACHE_DIR, cacheKey);

  try {
    // 1. Check if file exists in cache
    await fs.access(cachedFilePath); // Throws if file doesn't exist
    console.log(`Serving PDF from cache: ${filePathFromUrl} (Cache key: ${cacheKey})`);
    const fileBuffer = await fs.readFile(cachedFilePath);
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    const safeFilename = encodeURIComponent(path.basename(filePathFromUrl) || 'report.pdf');
    headers.set('Content-Disposition', `inline; filename="${safeFilename}"`);
    return new NextResponse(fileBuffer, { status: 200, headers });
  } catch (error) {
    // File not in cache or other error accessing it, proceed to fetch
    console.log(`PDF not in cache or error accessing cache for ${filePathFromUrl}. Fetching from source.`);
  }

  // 2. If not in cache, find Google Drive link
  const googleDriveUrl = await findGoogleDriveLink(filePathFromUrl);
  if (!googleDriveUrl) {
    return new NextResponse(`File path "${filePathFromUrl}" not found or no GDrive link.`, { status: 404 });
  }
  if (!googleDriveUrl.includes('drive.google.com')) {
    return new NextResponse('Resolved URL from CSV is not a valid GDrive URL.', { status: 500 });
  }

  const directDownloadUrl = convertToGoogleDriveDirectLink(googleDriveUrl);
  console.log(`Fetching PDF from: ${directDownloadUrl}`);

  try {
    // 3. Fetch from Google Drive
    const response = await fetch(directDownloadUrl);
    if (!response.ok || !response.body) {
      console.error(`Failed to fetch PDF from ${directDownloadUrl}: ${response.status} ${response.statusText}`);
      return new NextResponse(`Failed to fetch PDF: ${response.statusText}`, { status: response.status });
    }

    const pdfBuffer = await response.arrayBuffer();

    // 4. Save to cache
    // TODO: Implement cache size management (e.g., LRU eviction if > 5GB)
    try {
      await fs.writeFile(cachedFilePath, Buffer.from(pdfBuffer));
      console.log(`PDF cached: ${filePathFromUrl} (Cache key: ${cacheKey})`);
    } catch (cacheError) {
      console.error(`Failed to write PDF to cache (${cacheKey}):`, cacheError);
      // Continue serving the file even if caching fails
    }

    // 5. Serve to client
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    const safeFilename = encodeURIComponent(path.basename(filePathFromUrl) || 'report.pdf');
    headers.set('Content-Disposition', `inline; filename="${safeFilename}"`);
    return new NextResponse(pdfBuffer, { status: 200, headers });

  } catch (fetchError) {
    console.error(`Error fetching PDF from ${directDownloadUrl}:`, fetchError);
    return new NextResponse('Error fetching PDF', { status: 500 });
  }
}