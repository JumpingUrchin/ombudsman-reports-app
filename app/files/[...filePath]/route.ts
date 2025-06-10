import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';
import { TableRow } from '@/lib/types';
import crypto from 'crypto'; // For generating safe cache filenames
import { put, head, list, del } from '@vercel/blob';

export const dynamic = 'force-dynamic';

const PDF_CACHE_DIR = path.join(process.cwd(), '.cache', 'pdf_files');

// Ensure cache directory exists (for local development)
async function ensureCacheDirExists() {
  try {
    await fs.mkdir(PDF_CACHE_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create PDF cache directory:', error);
    // Depending on the error, you might want to handle this more gracefully
    // For now, if it fails, caching will likely fail.
  }
}

// Only create local cache directory in development
if (process.env.NODE_ENV === 'development') {
  ensureCacheDirExists(); // Call on module load
}

// Check if we're in production (Vercel)
const isProduction = process.env.NODE_ENV === 'production';

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

// Check if file exists in Vercel Blob storage
async function checkBlobCache(cacheKey: string): Promise<string | null> {
  try {
    const blobPath = `pdf-cache/${cacheKey}`;
    const blobInfo = await head(blobPath);
    return blobInfo?.url || null;
  } catch (error) {
    return null; // File doesn't exist in blob storage
  }
}

// Store file in Vercel Blob storage
async function storeBlobCache(cacheKey: string, pdfBuffer: ArrayBuffer): Promise<string | null> {
  try {
    // Check if we need to clean up cache before storing
    await manageBlobCacheSize();
    
    const blobPath = `pdf-cache/${cacheKey}`;
    const { url } = await put(blobPath, pdfBuffer, {
      access: 'public',
      contentType: 'application/pdf'
    });
    return url;
  } catch (error) {
    console.error('Failed to store PDF in blob cache:', error);
    return null;
  }
}

// Manage Vercel Blob cache size - delete oldest 50% of files when approaching 1GB limit
async function manageBlobCacheSize(): Promise<void> {
  try {
    // List all files in the pdf-cache folder
    const { blobs } = await list({ prefix: 'pdf-cache/' });
    
    if (blobs.length === 0) return;
    
    // Calculate total size
    const totalSize = blobs.reduce((sum, blob) => sum + blob.size, 0);
    const sizeLimitBytes = 900 * 1024 * 1024; // 900MB threshold (leave some buffer before 1GB)
    
    if (totalSize < sizeLimitBytes) {
      return; // No cleanup needed
    }
    
    console.log(`Blob cache size (${Math.round(totalSize / 1024 / 1024)}MB) approaching limit. Starting cleanup...`);
    
    // Sort by uploadedAt (oldest first) - this serves as our access time approximation
    const sortedBlobs = blobs.sort((a, b) =>
      new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
    );
    
    // Delete oldest 50% of files
    const filesToDelete = sortedBlobs.slice(0, Math.floor(sortedBlobs.length * 0.5));
    const deletionPromises = filesToDelete.map(blob =>
      del(blob.url).catch(error =>
        console.error(`Failed to delete blob ${blob.pathname}:`, error)
      )
    );
    
    await Promise.allSettled(deletionPromises);
    
    const deletedSize = filesToDelete.reduce((sum, blob) => sum + blob.size, 0);
    console.log(`Cleaned up ${filesToDelete.length} files, freed ${Math.round(deletedSize / 1024 / 1024)}MB`);
    
  } catch (error) {
    console.error('Failed to manage blob cache size:', error);
    // Don't throw - cache management failure shouldn't break file serving
  }
}

// Update blob access time by re-uploading with updated metadata
async function updateBlobAccessTime(cacheKey: string, existingUrl: string): Promise<void> {
  try {
    // Since Vercel Blob doesn't support updating metadata directly,
    // we'll fetch the file and re-upload it to update the uploadedAt timestamp
    const response = await fetch(existingUrl);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const blobPath = `pdf-cache/${cacheKey}`;
      await put(blobPath, buffer, {
        access: 'public',
        contentType: 'application/pdf'
      });
      console.log(`Updated access time for cached file: ${cacheKey}`);
    }
  } catch (error) {
    console.error(`Failed to update access time for ${cacheKey}:`, error);
    // Don't throw - access time update failure shouldn't break file serving
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filePath: string[] }> }
) {
  const resolvedParams = await params;
  const filePathFromUrl = resolvedParams.filePath.join('/');
  const cacheKey = getCacheKey(filePathFromUrl);
  const cachedFilePath = path.join(PDF_CACHE_DIR, cacheKey);

  // 1. Check if file exists in cache
  if (isProduction) {
    // Use Vercel Blob storage in production
    const blobUrl = await checkBlobCache(cacheKey);
    if (blobUrl) {
      console.log(`Serving PDF from Vercel Blob cache: ${filePathFromUrl} (Cache key: ${cacheKey})`);
      
      // Update access time in background (don't await to avoid slowing down response)
      updateBlobAccessTime(cacheKey, blobUrl).catch(error =>
        console.error('Background access time update failed:', error)
      );
      
      // Fetch and serve the cached file
      const blobResponse = await fetch(blobUrl);
      if (blobResponse.ok) {
        const fileBuffer = await blobResponse.arrayBuffer();
        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf');
        const safeFilename = encodeURIComponent(path.basename(filePathFromUrl) || 'report.pdf');
        headers.set('Content-Disposition', `inline; filename="${safeFilename}"`);
        return new NextResponse(fileBuffer, { status: 200, headers });
      }
    }
  } else {
    // Use local file system cache in development
    try {
      await fs.access(cachedFilePath); // Throws if file doesn't exist
      console.log(`Serving PDF from local cache: ${filePathFromUrl} (Cache key: ${cacheKey})`);
      const fileBuffer = await fs.readFile(cachedFilePath);
      const headers = new Headers();
      headers.set('Content-Type', 'application/pdf');
      const safeFilename = encodeURIComponent(path.basename(filePathFromUrl) || 'report.pdf');
      headers.set('Content-Disposition', `inline; filename="${safeFilename}"`);
      return new NextResponse(fileBuffer, { status: 200, headers });
    } catch (error) {
      // File not in cache or other error accessing it, proceed to fetch
      console.log(`PDF not in local cache or error accessing cache for ${filePathFromUrl}. Fetching from source.`);
    }
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
    if (isProduction) {
      // Store in Vercel Blob storage
      try {
        const blobUrl = await storeBlobCache(cacheKey, pdfBuffer);
        if (blobUrl) {
          console.log(`PDF cached in Vercel Blob: ${filePathFromUrl} (Cache key: ${cacheKey})`);
        }
      } catch (cacheError) {
        console.error(`Failed to write PDF to Vercel Blob cache (${cacheKey}):`, cacheError);
        // Continue serving the file even if caching fails
      }
    } else {
      // Store in local file system (development)
      try {
        await fs.writeFile(cachedFilePath, Buffer.from(pdfBuffer));
        console.log(`PDF cached locally: ${filePathFromUrl} (Cache key: ${cacheKey})`);
      } catch (cacheError) {
        console.error(`Failed to write PDF to local cache (${cacheKey}):`, cacheError);
        // Continue serving the file even if caching fails
      }
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