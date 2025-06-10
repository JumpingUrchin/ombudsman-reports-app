import { NextRequest, NextResponse } from 'next/server';

const locales = ['en', 'zh-HK'];
const defaultLocale = 'zh-HK';

function getLocale(request: NextRequest): string {
  // Check if there is any supported locale in the pathname
  const pathname = request.nextUrl.pathname;
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // If there's no locale in the pathname, determine the best locale
  if (pathnameIsMissingLocale) {
    // Try to get locale from Accept-Language header
    const acceptLanguage = request.headers.get('accept-language');
    if (acceptLanguage) {
      // Parse Accept-Language header to find preferred languages
      const languages = acceptLanguage
        .split(',')
        .map(lang => {
          const [locale, q = '1'] = lang.trim().split(';q=');
          return {
            locale: locale.trim(),
            quality: parseFloat(q)
          };
        })
        .sort((a, b) => b.quality - a.quality);

      // Check for Chinese variants first
      for (const { locale } of languages) {
        if (locale.startsWith('zh')) {
          // Check for Traditional Chinese variants
          if (locale.includes('HK') ||
              locale.includes('TW') ||
              locale.includes('MO') ||
              locale === 'zh-Hant' ||
              locale === 'zh-TW' ||
              locale === 'zh-HK' ||
              locale === 'zh-MO') {
            return 'zh-HK';
          }
          // For Simplified Chinese, still default to Traditional Chinese
          // since this is Hong Kong Ombudsman
          return 'zh-HK';
        }
        
        // Check for English
        if (locale.startsWith('en')) {
          return 'en';
        }
      }
    }
    
    // Default to Traditional Chinese for Hong Kong context
    return defaultLocale;
  }

  // Extract locale from pathname
  const locale = pathname.split('/')[1];
  return locales.includes(locale) ? locale : defaultLocale;
}

export function middleware(request: NextRequest) {
  // Check if there is any supported locale in the pathname
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for API routes, static files, and special paths
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/files/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // Redirect if there is no locale
  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    return NextResponse.redirect(
      new URL(`/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  // Matcher ignoring `/_next/` and `/api/`
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};