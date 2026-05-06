import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <select
      aria-label="Language"
      className="input !w-auto !py-1.5 !px-2 text-sm"
      value={i18n.language.split('-')[0]}
      onChange={(e) => void i18n.changeLanguage(e.target.value)}
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.label}
        </option>
      ))}
    </select>
  );
}
