import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/auth';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

interface LocationState {
  from?: { pathname: string };
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      const from = (location.state as LocationState | null)?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError((err as Error).message || t('auth.error_generic'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md card">
        <div className="card-body">
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-brand-700">{t('app.name')}</div>
            <div className="text-sm text-slate-500 mt-1">{t('app.tagline')}</div>
          </div>

          <h1 className="text-xl font-semibold mb-4">
            {mode === 'login' ? t('auth.login') : t('auth.register')}
          </h1>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={6}
              />
            </div>

            {error ? (
              <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                {error}
              </div>
            ) : null}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? t('auth.loading') : t('auth.submit')}
            </button>
          </form>

          <div className="text-center text-sm text-slate-500 mt-4">
            {mode === 'login' ? (
              <>
                {t('auth.no_account')}{' '}
                <Link to="/register" className="text-brand-600 hover:underline">
                  {t('auth.register')}
                </Link>
              </>
            ) : (
              <>
                {t('auth.have_account')}{' '}
                <Link to="/login" className="text-brand-600 hover:underline">
                  {t('auth.login')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
