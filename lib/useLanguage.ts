'use client';

import { useState, useEffect } from 'react';
import { Language, detectBrowserLanguage, getTranslations, LANGUAGE_STORAGE_KEY, Translations } from './i18n';

export function useLanguage() {
  const [isClient, setIsClient] = useState(false);
  const [language, setLanguage] = useState<Language>('zh-HK');

  useEffect(() => {
    setIsClient(true);
    
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
  }, []);

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    
    // Save to localStorage for persistence
    if (isClient) {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
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