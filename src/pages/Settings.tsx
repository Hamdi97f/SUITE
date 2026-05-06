import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useAuth } from '../store/auth';
import { useCompany, DEFAULT_COMPANY, type CompanyInfo } from '../store/company';
import { user as userApi, config } from '../api/client';
import { SUPPORTED_CURRENCIES } from '../lib/format';

const MAX_LOGO_BYTES = 200 * 1024; // 200 KB cap (kept inline as base64)

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function Settings() {
  const { t } = useTranslation();
  const token = useAuth((s) => s.token);
  const me = useAuth((s) => s.user);
  const { info, save, saving, load, loading, error } = useCompany();
  const [draft, setDraft] = useState<CompanyInfo>(info);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Email / password change
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  const [accountErr, setAccountErr] = useState<string | null>(null);

  useEffect(() => {
    setDraft(info);
  }, [info]);

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  const update = <K extends keyof CompanyInfo>(key: K, value: CompanyInfo[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoError(t('settings.logo_invalid'));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError(t('settings.logo_too_big'));
      return;
    }
    try {
      const dataUrl = await readFileAsDataURL(file);
      update('logo_data_url', dataUrl);
    } catch {
      setLogoError(t('settings.logo_invalid'));
    }
  };

  const onSubmitCompany = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await save(token, draft);
      setSavedAt(Date.now());
    } catch {
      /* error already in the store */
    }
  };

  const resetCompany = () => setDraft({ ...DEFAULT_COMPANY });

  const onSubmitAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setAccountErr(null);
    setAccountMsg(null);
    if (!email && !password) {
      setAccountErr(t('settings.account_no_change'));
      return;
    }
    setAccountBusy(true);
    try {
      const body: { email?: string; password?: string } = {};
      if (email) body.email = email;
      if (password) body.password = password;
      await userApi.update(token, body);
      setAccountMsg(t('settings.account_saved'));
      setEmail('');
      setPassword('');
    } catch (err) {
      setAccountErr((err as Error).message);
    } finally {
      setAccountBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={t('settings.title')} description={t('settings.desc')} />

      {/* Company profile */}
      <form onSubmit={onSubmitCompany} className="card mb-4">
        <div className="card-header">
          <div>
            <div className="font-semibold">{t('settings.company')}</div>
            <div className="text-xs text-slate-500">{t('settings.company_hint')}</div>
          </div>
          {loading ? <span className="text-xs text-slate-500">{t('common.loading')}</span> : null}
        </div>
        <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 flex items-center gap-4">
            <div className="w-20 h-20 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
              {draft.logo_data_url ? (
                <img src={draft.logo_data_url} alt="logo" className="max-w-full max-h-full" />
              ) : (
                <span className="text-slate-400 text-xs">{t('settings.no_logo')}</span>
              )}
            </div>
            <div>
              <label className="btn-secondary cursor-pointer">
                {t('settings.upload_logo')}
                <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
              </label>
              {draft.logo_data_url ? (
                <button
                  type="button"
                  onClick={() => update('logo_data_url', '')}
                  className="ml-2 text-sm text-red-600 hover:underline"
                >
                  {t('common.delete')}
                </button>
              ) : null}
              <div className="text-xs text-slate-500 mt-1">{t('settings.logo_hint')}</div>
              {logoError ? <div className="text-xs text-red-600 mt-1">{logoError}</div> : null}
            </div>
          </div>

          <div>
            <label className="label">{t('settings.f.name')}</label>
            <input className="input" value={draft.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('settings.f.legal_form')}</label>
            <input
              className="input"
              value={draft.legal_form}
              onChange={(e) => update('legal_form', e.target.value)}
              placeholder="SARL, SA, SAS, LLC, …"
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">{t('settings.f.address')}</label>
            <input className="input" value={draft.address} onChange={(e) => update('address', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('settings.f.city')}</label>
            <input className="input" value={draft.city} onChange={(e) => update('city', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('settings.f.country')}</label>
            <input className="input" value={draft.country} onChange={(e) => update('country', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('settings.f.phone')}</label>
            <input className="input" value={draft.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('settings.f.email')}</label>
            <input
              type="email"
              className="input"
              value={draft.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t('settings.f.website')}</label>
            <input className="input" value={draft.website} onChange={(e) => update('website', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('settings.f.tax_id')}</label>
            <input
              className="input"
              value={draft.tax_id}
              onChange={(e) => update('tax_id', e.target.value)}
              placeholder="Matricule fiscal / VAT / EIN"
            />
          </div>
          <div>
            <label className="label">{t('settings.f.registration_no')}</label>
            <input
              className="input"
              value={draft.registration_no}
              onChange={(e) => update('registration_no', e.target.value)}
              placeholder="RC / SIREN / Reg. no."
            />
          </div>
          <div>
            <label className="label">{t('settings.f.currency')}</label>
            <select
              className="input"
              value={draft.currency}
              onChange={(e) => update('currency', e.target.value)}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('settings.f.vat_rate')}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              className="input"
              value={draft.vat_rate}
              onChange={(e) => update('vat_rate', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">{t('settings.f.invoice_prefix')}</label>
            <input
              className="input"
              value={draft.invoice_prefix}
              onChange={(e) => update('invoice_prefix', e.target.value)}
              placeholder="INV-2026-"
            />
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-4">
            <div className="md:col-span-2 font-medium text-sm text-slate-600">{t('settings.bank')}</div>
            <div>
              <label className="label">{t('settings.f.bank_name')}</label>
              <input className="input" value={draft.bank_name} onChange={(e) => update('bank_name', e.target.value)} />
            </div>
            <div>
              <label className="label">{t('settings.f.bank_account')}</label>
              <input
                className="input"
                value={draft.bank_account}
                onChange={(e) => update('bank_account', e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t('settings.f.bank_iban')}</label>
              <input
                className="input"
                value={draft.bank_iban}
                onChange={(e) => update('bank_iban', e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t('settings.f.bank_swift')}</label>
              <input
                className="input"
                value={draft.bank_swift}
                onChange={(e) => update('bank_swift', e.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="label">{t('settings.f.invoice_footer')}</label>
            <textarea
              className="input min-h-[80px]"
              value={draft.invoice_footer}
              onChange={(e) => update('invoice_footer', e.target.value)}
              placeholder={t('settings.f.invoice_footer_hint')}
            />
          </div>
        </div>
        <div className="card-header !border-t !border-b-0 justify-end gap-2">
          {error ? <span className="text-sm text-red-600 me-auto">{error}</span> : null}
          {savedAt ? <span className="text-sm text-emerald-600 me-auto">{t('settings.saved')}</span> : null}
          <button type="button" onClick={resetCompany} className="btn-secondary">
            {t('common.reset')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>

      {/* Account */}
      <form onSubmit={onSubmitAccount} className="card mb-4">
        <div className="card-header">
          <div>
            <div className="font-semibold">{t('settings.account')}</div>
            <div className="text-xs text-slate-500">{me?.email}</div>
          </div>
        </div>
        <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">{t('settings.new_email')}</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={me?.email}
            />
          </div>
          <div>
            <label className="label">{t('settings.new_password')}</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="card-header !border-t !border-b-0 justify-end gap-2">
          {accountErr ? <span className="text-sm text-red-600 me-auto">{accountErr}</span> : null}
          {accountMsg ? <span className="text-sm text-emerald-600 me-auto">{accountMsg}</span> : null}
          <button type="submit" className="btn-primary" disabled={accountBusy}>
            {accountBusy ? t('common.saving') : t('settings.update_account')}
          </button>
        </div>
      </form>

      {/* Language */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="font-semibold">{t('settings.language')}</div>
        </div>
        <div className="card-body">
          <LanguageSwitcher />
        </div>
      </div>

      {/* API */}
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
            <span
              className={
                config.hasApiKey ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'
              }
            >
              {config.hasApiKey ? t('settings.yes') : t('settings.no')}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
