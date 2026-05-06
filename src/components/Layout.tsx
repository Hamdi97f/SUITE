import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/auth';
import { LanguageSwitcher } from './LanguageSwitcher';

interface NavItem {
  to: string;
  labelKey: string;
  icon: string;
}

const NAV: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: '🏠' },
  { to: '/invoicing', labelKey: 'nav.invoicing', icon: '🧾' },
  { to: '/inventory', labelKey: 'nav.inventory', icon: '📦' },
  { to: '/cheque', labelKey: 'nav.cheque', icon: '🧮' },
  { to: '/effet', labelKey: 'nav.effet', icon: '🏦' },
  { to: '/pos', labelKey: 'nav.pos', icon: '💳' },
  { to: '/settings', labelKey: 'nav.settings', icon: '⚙️' },
];

export function Layout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 bg-white border-e border-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-200">
          <div className="text-xl font-bold tracking-tight text-brand-700">{t('app.name')}</div>
          <div className="text-xs text-slate-500">{t('app.tagline')}</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-700 hover:bg-slate-100',
                ].join(' ')
              }
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200 text-xs text-slate-500">
          v0.1.0 · © SUITE
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6">
          <div className="text-sm text-slate-500 truncate">{user?.email}</div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button onClick={handleLogout} className="btn-secondary !py-1.5">
              {t('nav.logout')}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
