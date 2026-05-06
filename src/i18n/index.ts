import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import es from './locales/es.json';
import it from './locales/it.json';
import hi from './locales/hi.json';
import zh from './locales/zh.json';

export type LanguageCode = 'en' | 'fr' | 'ar' | 'es' | 'it' | 'hi' | 'zh';

export const SUPPORTED_LANGUAGES: { code: LanguageCode; label: string; flag: string; rtl?: boolean }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

const RTL_LANGS: LanguageCode[] = ['ar'];

export function applyDirection(lang: string) {
  const isRtl = RTL_LANGS.includes(lang as LanguageCode);
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ar: { translation: ar },
      es: { translation: es },
      it: { translation: it },
      hi: { translation: hi },
      zh: { translation: zh },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'suite.lang',
    },
  })
  .then(() => applyDirection(i18n.language));

i18n.on('languageChanged', (lng) => applyDirection(lng));

export default i18n;
