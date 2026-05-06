import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';

export function ComingSoon({ titleKey, descKey }: { titleKey: string; descKey: string }) {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t(titleKey)} description={t(descKey)} />
      <div className="card">
        <div className="card-body text-center py-16">
          <div className="text-5xl mb-3">🚧</div>
          <p className="text-slate-600">{t('modules.coming_soon')}</p>
        </div>
      </div>
    </>
  );
}
