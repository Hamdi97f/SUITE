import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../store/auth';
import { useCompany } from '../store/company';
import {
  listAndLoad,
  saveDoc,
  deleteDoc,
  newId,
  type DocMeta,
  type Doc,
} from '../lib/files-store';
import {
  amountToWords,
  formatCurrency,
  formatDate,
  SUPPORTED_CURRENCIES,
} from '../lib/format';

const COLLECTION = 'cheques';

interface ChequeData {
  id: string;
  payee: string;
  amount: number;
  currency: string;
  date: string;
  city: string;
  bank_name: string;
  account_no: string;
  cheque_no: string;
  memo: string;
  signed_by: string;
  /** Used to choose which language is used to write the amount in words. */
  words_lang: 'fr' | 'en';
  created_at: string;
}

function emptyCheque(currency: string): ChequeData {
  return {
    id: newId(),
    payee: '',
    amount: 0,
    currency,
    date: new Date().toISOString().slice(0, 10),
    city: '',
    bank_name: '',
    account_no: '',
    cheque_no: '',
    memo: '',
    signed_by: '',
    words_lang: 'fr',
    created_at: new Date().toISOString(),
  };
}

export function Cheque() {
  const { t, i18n } = useTranslation();
  const token = useAuth((s) => s.token);
  const company = useCompany((s) => s.info);
  const [docs, setDocs] = useState<Doc<ChequeData>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'edit' | 'print'>('list');
  const [draft, setDraft] = useState<ChequeData>(emptyCheque(company.currency));
  const [editingMeta, setEditingMeta] = useState<DocMeta | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setDocs(await listAndLoad<ChequeData>(token, COLLECTION));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const startNew = () => {
    setDraft({
      ...emptyCheque(company.currency),
      city: company.city,
      signed_by: company.name,
      bank_name: company.bank_name,
      account_no: company.bank_account,
      words_lang: i18n.language.startsWith('fr') ? 'fr' : 'en',
    });
    setEditingMeta(null);
    setView('edit');
  };

  const startEdit = (d: Doc<ChequeData>) => {
    setDraft(d.data);
    setEditingMeta({
      id: d.id,
      fileId: d.fileId,
      fileName: d.fileName,
      size: d.size,
      createdAt: d.createdAt,
    });
    setView('edit');
  };

  const printDoc = (d: Doc<ChequeData>) => {
    setDraft(d.data);
    setView('print');
  };

  const onDelete = async (d: Doc<ChequeData>) => {
    if (!token) return;
    if (!window.confirm(t('cheque.confirm_delete'))) return;
    try {
      await deleteDoc(token, {
        id: d.id,
        fileId: d.fileId,
        fileName: d.fileName,
        size: d.size,
        createdAt: d.createdAt,
      });
      setDocs((xs) => xs.filter((x) => x.id !== d.id));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await saveDoc<ChequeData>(token, COLLECTION, draft.id, draft, editingMeta);
      await load();
      setView('print');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (view === 'print') {
    return (
      <PrintCheque
        cheque={draft}
        company={company}
        lang={i18n.language}
        onBack={() => {
          setView('list');
        }}
      />
    );
  }

  if (view === 'edit') {
    return (
      <>
        <PageHeader
          title={editingMeta ? t('cheque.edit_title') : t('cheque.new_title')}
          description={t('cheque.edit_desc')}
          actions={
            <button onClick={() => setView('list')} className="btn-secondary">
              {t('common.back')}
            </button>
          }
        />
        {error ? (
          <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 mb-4">
            {error}
          </div>
        ) : null}
        <form onSubmit={onSubmit} className="card">
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">{t('cheque.payee')}</label>
              <input
                className="input"
                required
                value={draft.payee}
                onChange={(e) => setDraft({ ...draft, payee: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('cheque.amount')}</label>
              <input
                type="number"
                step="0.001"
                min="0"
                required
                className="input"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">{t('cheque.currency')}</label>
              <select
                className="input"
                value={draft.currency}
                onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('cheque.date')}</label>
              <input
                type="date"
                className="input"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('cheque.city')}</label>
              <input
                className="input"
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('cheque.bank')}</label>
              <input
                className="input"
                value={draft.bank_name}
                onChange={(e) => setDraft({ ...draft, bank_name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('cheque.account_no')}</label>
              <input
                className="input"
                value={draft.account_no}
                onChange={(e) => setDraft({ ...draft, account_no: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('cheque.cheque_no')}</label>
              <input
                className="input"
                value={draft.cheque_no}
                onChange={(e) => setDraft({ ...draft, cheque_no: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('cheque.signed_by')}</label>
              <input
                className="input"
                value={draft.signed_by}
                onChange={(e) => setDraft({ ...draft, signed_by: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('cheque.words_lang')}</label>
              <select
                className="input"
                value={draft.words_lang}
                onChange={(e) =>
                  setDraft({ ...draft, words_lang: e.target.value as 'fr' | 'en' })
                }
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">{t('cheque.memo')}</label>
              <input
                className="input"
                value={draft.memo}
                onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
              <div className="text-xs text-slate-500 mb-1">{t('cheque.preview_words')}</div>
              <div className="italic">
                {amountToWords(draft.amount, draft.currency, draft.words_lang)}
              </div>
            </div>
          </div>
          <div className="card-header !border-t !border-b-0 justify-end gap-2">
            <button type="button" onClick={() => setView('list')} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? t('common.saving') : t('cheque.save_and_print')}
            </button>
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('modules.cheque.title')}
        description={t('modules.cheque.desc')}
        actions={
          <>
            <button onClick={() => void load()} className="btn-secondary" disabled={loading}>
              {t('common.refresh')}
            </button>
            <button onClick={startNew} className="btn-primary">
              + {t('cheque.new')}
            </button>
          </>
        }
      />
      {error ? (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 mb-4">
          {error}
        </div>
      ) : null}
      <div className="card">
        <div className="card-header">
          <div className="font-semibold">{t('cheque.list')}</div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">{t('common.loading')}</div>
          ) : docs.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">{t('cheque.empty')}</div>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>{t('cheque.cheque_no')}</th>
                  <th>{t('cheque.payee')}</th>
                  <th>{t('cheque.bank')}</th>
                  <th>{t('cheque.date')}</th>
                  <th className="text-end">{t('cheque.amount')}</th>
                  <th className="text-end">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td className="font-mono text-xs">{d.data.cheque_no || '—'}</td>
                    <td className="font-medium">{d.data.payee}</td>
                    <td>{d.data.bank_name || '—'}</td>
                    <td>{formatDate(d.data.date, i18n.language)}</td>
                    <td className="text-end font-medium">
                      {formatCurrency(d.data.amount, d.data.currency, i18n.language)}
                    </td>
                    <td className="text-end">
                      <button
                        onClick={() => printDoc(d)}
                        className="text-brand-700 hover:underline text-sm me-3"
                      >
                        {t('common.print')}
                      </button>
                      <button
                        onClick={() => startEdit(d)}
                        className="text-slate-700 hover:underline text-sm me-3"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => void onDelete(d)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function PrintCheque({
  cheque,
  company,
  lang,
  onBack,
}: {
  cheque: ChequeData;
  company: ReturnType<typeof useCompany.getState>['info'];
  lang: string;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const words = amountToWords(cheque.amount, cheque.currency, cheque.words_lang);
  const formattedAmount = formatCurrency(cheque.amount, cheque.currency, lang);
  const formattedDate = formatDate(cheque.date, lang);

  return (
    <div>
      <div className="print:hidden mb-4 flex justify-between items-center">
        <button onClick={onBack} className="btn-secondary">
          ← {t('common.back')}
        </button>
        <button onClick={() => window.print()} className="btn-primary">
          🖨️ {t('common.print')}
        </button>
      </div>

      <div className="print-cheque mx-auto bg-white text-slate-900 shadow print:shadow-none p-6">
        <div className="flex justify-between items-start border-b border-slate-300 pb-3 mb-4">
          <div>
            <div className="text-xs uppercase text-slate-500">{t('cheque.bank')}</div>
            <div className="font-bold text-lg">{cheque.bank_name || '—'}</div>
            {cheque.account_no ? (
              <div className="text-xs text-slate-600 font-mono mt-1">
                {t('cheque.account_no')}: {cheque.account_no}
              </div>
            ) : null}
          </div>
          <div className="text-end">
            <div className="text-xs uppercase text-slate-500">{t('cheque.cheque_no')}</div>
            <div className="font-mono font-semibold">{cheque.cheque_no || '—'}</div>
            <div className="mt-3 border border-slate-400 px-3 py-1 inline-block font-mono text-base">
              {formattedAmount}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-xs uppercase text-slate-500 mb-1">{t('cheque.payee')}</div>
            <div className="border-b border-dotted border-slate-400 pb-1 text-lg font-medium min-h-[1.75rem]">
              {cheque.payee}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500 mb-1">{t('cheque.amount_in_words')}</div>
            <div className="border-b border-dotted border-slate-400 pb-1 italic min-h-[1.5rem]">
              {words}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs uppercase text-slate-500 mb-1">{t('cheque.memo')}</div>
              <div className="border-b border-dotted border-slate-400 pb-1 min-h-[1.5rem]">
                {cheque.memo}
              </div>
            </div>
            <div className="text-end">
              <div className="text-xs uppercase text-slate-500 mb-1">
                {cheque.city ? `${cheque.city}, ` : ''}
                {t('cheque.date')}
              </div>
              <div className="border-b border-dotted border-slate-400 pb-1 min-h-[1.5rem]">
                {formattedDate}
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-12">
            <div className="text-end">
              <div className="border-t border-slate-400 pt-1 px-8">{cheque.signed_by || ''}</div>
              <div className="text-xs text-slate-500">{t('cheque.signature')}</div>
            </div>
          </div>
        </div>

        {company.invoice_footer ? (
          <div className="mt-6 pt-2 border-t border-slate-200 text-xs text-slate-400 text-center">
            {company.name}
          </div>
        ) : null}
      </div>
    </div>
  );
}
