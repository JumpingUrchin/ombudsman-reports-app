import { Languages } from 'lucide-react';
import { Language } from '@/lib/i18n';

interface LanguageSwitcherSSRProps {
  currentLanguage: Language;
}

export default function LanguageSwitcherSSR({ currentLanguage }: LanguageSwitcherSSRProps) {
  return (
    <div className="flex items-center gap-2">
      <Languages className="h-5 w-5 text-gray-600" />
      <div className="flex rounded-lg border border-gray-300 overflow-hidden">
        <a
          href="/zh-HK"
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            currentLanguage === 'zh-HK'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          繁中
        </a>
        <a
          href="/en"
          className={`px-3 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
            currentLanguage === 'en'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          EN
        </a>
      </div>
    </div>
  );
}