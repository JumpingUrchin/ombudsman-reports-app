'use client';

import { useState, useEffect } from 'react';
import { Language, detectBrowserLanguage, getTranslations, LANGUAGE_STORAGE_KEY, Translations } from './i18n';

export function useLanguage(initialLocale?: Language) {
  const [isClient, setIsClient] = useState(false);
  const [language, setLanguage] = useState<Language>(initialLocale || 'zh-HK');

  useEffect(() => {
    setIsClient(true);
    
    // If initial locale is provided, use it and save to localStorage
    if (initialLocale) {
      setLanguage(initialLocale);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, initialLocale);
      return;
    }
    
    // Try to load saved language from localStorage
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'zh-HK')) {
      setLanguage(savedLanguage);
    } else {
      // Detect browser language preference
      const browserLanguage = detectBrowserLanguage();
      setLanguage(browserLanguage);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, browserLanguage);
    }
  }, [initialLocale]);

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    
    // Save to localStorage for persistence
    if (isClient) {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
      // Navigate to the new locale route
      window.location.href = `/${newLanguage}`;
    }
  };

  const t: Translations = getTranslations(language);

  return {
    language,
    changeLanguage,
    t,
    isClient,
  };
}