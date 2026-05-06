import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../store/auth';
import { user as userApi, type UserProfile } from '../api/client';

const MODULES: { to: string; titleKey: string; descKey: string; icon: string; color: string }[] = [
  { to: '/invoicing', titleKey: 'modules.invoicing.title', descKey: 'modules.invoicing.desc', icon: '🧾', color: 'bg-brand-50 text-brand-700' },
  { to: '/inventory', titleKey: 'modules.inventory.title', descKey: 'modules.inventory.desc', icon: '📦', color: 'bg-emerald-50 text-emerald-700' },
  { to: '/cheque', titleKey: 'modules.cheque.title', descKey: 'modules.cheque.desc', icon: '🧮', color: 'bg-amber-50 text-amber-700' },
  { to: '/effet', titleKey: 'modules.effet.title', descKey: 'modules.effet.desc', icon: '🏦', color: 'bg-purple-50 text-purple-700' },
  { to: '/pos', titleKey: 'modules.pos.title', descKey: 'modules.pos.desc', icon: '💳', color: 'bg-rose-50 text-rose-700' },
  { to: '/files', titleKey: 'modules.files.title', descKey: 'modules.files.desc', icon: '📁', color: 'bg-sky-50 text-sky-700' },
];

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function Dashboard() {
  const { t } = useTranslation();
  const token = useAuth((s) => s.token);
  const authUser = useAuth((s) => s.user);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    userApi
      .me(token)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        /* keep dashboard usable even if profile fetch fails */
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const usagePct =
    profile && profile.storage_limit > 0
      ? Math.min(100, (profile.storage_used / profile.storage_limit) * 100)
      : 0;

  return (
    <>
      <PageHeader
        title={t('dashboard.title')}
        description={`${t('dashboard.welcome')}, ${authUser?.email ?? ''}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="card-header">
            <div className="font-semibold">{t('dashboard.storage')}</div>
          </div>
          <div className="card-body">
            {profile ? (
              <>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-600">{t('dashboard.used')}</span>
                  <span className="font-medium">
                    {formatBytes(profile.storage_used)} / {formatBytes(profile.storage_limit)}
                  </span>
                </div>
                <div className="h-2 rounded bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-brand-600 transition-all"
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500">—</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="font-semibold">{t('dashboard.subscription')}</div>
          </div>
          <div className="card-body">
            {profile ? (
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-slate-500">{t('dashboard.status')}: </span>
                  <span className="font-medium capitalize">{profile.subscription_status}</span>
                </div>
                {profile.subscription_end ? (
                  <div className="text-slate-500">
                    {new Date(profile.subscription_end).toLocaleDateString()}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-slate-500">—</div>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">{t('dashboard.modules')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m) => (
          <Link key={m.to} to={m.to} className="card hover:shadow-md transition-shadow">
            <div className="card-body">
              <div className={`w-10 h-10 rounded-md flex items-center justify-center text-xl ${m.color} mb-3`}>
                {m.icon}
              </div>
              <div className="font-semibold text-slate-900">{t(m.titleKey)}</div>
              <div className="text-sm text-slate-500 mt-1">{t(m.descKey)}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <span className="text-xs text-slate-400">
          Powered by <span className="font-semibold text-slate-500">Solvia</span>
        </span>
      </div>
    </>
  );
}
