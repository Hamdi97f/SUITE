import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { config } from '../api/client';

export function Settings() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('settings.title')} />

      <div className="card mb-4">
        <div className="card-header">
          <div className="font-semibold">{t('settings.language')}</div>
        </div>
        <div className="card-body">
          <LanguageSwitcher />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="font-semibold">{t('settings.api')}</div>
        </div>
        <div className="card-body space-y-2 text-sm">
          <div>
            <span className="text-slate-500">{t('settings.base_url')}: </span>
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{config.baseUrl}</code>
          </div>
          <div>
            <span className="text-slate-500">{t('settings.api_key_status')}: </span>
            <span className={config.hasApiKey ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
              {config.hasApiKey ? t('settings.yes') : t('settings.no')}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
