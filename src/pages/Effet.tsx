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

const COLLECTION = 'effets';

interface EffetData {
  id: string;
  /** Effet / Letter of Exchange / Traite identifier. */
  ref_no: string;
  /** Issue place + date. */
  place: string;
  issue_date: string;
  /** Maturity / due date — when the effet must be paid. */
  due_date: string;
  amount: number;
  currency: string;
  /** The drawer (tireur) — the party that creates the effet. */
  drawer_name: string;
  drawer_address: string;
  drawer_tax_id: string;
  /** The drawee (tiré) — the party that owes the money. */
  drawee_name: string;
  drawee_address: string;
  drawee_bank: string;
  drawee_rib: string;
  /** The beneficiary (bénéficiaire) — usually the drawer or its bank. */
  beneficiary_name: string;
  /** Domiciliation: bank where the effet is payable. */
  domiciliation_bank: string;
  domiciliation_address: string;
  /** Optional reference of the underlying invoice. */
  invoice_ref: string;
  notes: string;
  words_lang: 'fr' | 'en';
  created_at: string;
}

function emptyEffet(currency: string): EffetData {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: newId(),
    ref_no: '',
    place: '',
    issue_date: today,
    due_date: today,
    amount: 0,
    currency,
    drawer_name: '',
    drawer_address: '',
    drawer_tax_id: '',
    drawee_name: '',
    drawee_address: '',
    drawee_bank: '',
    drawee_rib: '',
    beneficiary_name: '',
    domiciliation_bank: '',
    domiciliation_address: '',
    invoice_ref: '',
    notes: '',
    words_lang: 'fr',
    created_at: new Date().toISOString(),
  };
}

export function Effet() {
  const { t, i18n } = useTranslation();
  const token = useAuth((s) => s.token);
  const company = useCompany((s) => s.info);
  const [docs, setDocs] = useState<Doc<EffetData>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'edit' | 'print'>('list');
  const [draft, setDraft] = useState<EffetData>(emptyEffet(company.currency));
  const [editingMeta, setEditingMeta] = useState<DocMeta | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setDocs(await listAndLoad<EffetData>(token, COLLECTION));
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
      ...emptyEffet(company.currency),
      drawer_name: company.name,
      drawer_address: [company.address, company.city, company.country].filter(Boolean).join(', '),
      drawer_tax_id: company.tax_id,
      beneficiary_name: company.name,
      place: company.city,
      domiciliation_bank: company.bank_name,
      domiciliation_address: company.bank_iban,
      words_lang: i18n.language.startsWith('fr') ? 'fr' : 'en',
    });
    setEditingMeta(null);
    setView('edit');
  };

  const startEdit = (d: Doc<EffetData>) => {
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

  const printDoc = (d: Doc<EffetData>) => {
    setDraft(d.data);
    setView('print');
  };

  const onDelete = async (d: Doc<EffetData>) => {
    if (!token) return;
    if (!window.confirm(t('effet.confirm_delete'))) return;
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
      await saveDoc<EffetData>(token, COLLECTION, draft.id, draft, editingMeta);
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
      <PrintEffet effet={draft} company={company} lang={i18n.language} onBack={() => setView('list')} />
    );
  }

  if (view === 'edit') {
    return (
      <>
        <PageHeader
          title={editingMeta ? t('effet.edit_title') : t('effet.new_title')}
          description={t('effet.edit_desc')}
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
        <form onSubmit={onSubmit} className="card mb-4">
          <div className="card-header">
            <div className="font-semibold">{t('effet.header')}</div>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">{t('effet.ref_no')}</label>
              <input
                className="input"
                value={draft.ref_no}
                onChange={(e) => setDraft({ ...draft, ref_no: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('effet.place')}</label>
              <input
                className="input"
                value={draft.place}
                onChange={(e) => setDraft({ ...draft, place: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('effet.invoice_ref')}</label>
              <input
                className="input"
                value={draft.invoice_ref}
                onChange={(e) => setDraft({ ...draft, invoice_ref: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('effet.issue_date')}</label>
              <input
                type="date"
                className="input"
                value={draft.issue_date}
                onChange={(e) => setDraft({ ...draft, issue_date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('effet.due_date')}</label>
              <input
                type="date"
                className="input"
                value={draft.due_date}
                onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('effet.words_lang')}</label>
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
            <div>
              <label className="label">{t('effet.amount')}</label>
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
              <label className="label">{t('effet.currency')}</label>
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
              <label className="label">{t('effet.beneficiary_name')}</label>
              <input
                className="input"
                value={draft.beneficiary_name}
                onChange={(e) => setDraft({ ...draft, beneficiary_name: e.target.value })}
              />
            </div>
          </div>

          <div className="card-header !border-t">
            <div className="font-semibold">{t('effet.drawer')}</div>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">{t('effet.drawer_name')}</label>
              <input
                className="input"
                value={draft.drawer_name}
                onChange={(e) => setDraft({ ...draft, drawer_name: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">{t('effet.drawer_address')}</label>
              <input
                className="input"
                value={draft.drawer_address}
                onChange={(e) => setDraft({ ...draft, drawer_address: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('effet.drawer_tax_id')}</label>
              <input
                className="input"
                value={draft.drawer_tax_id}
                onChange={(e) => setDraft({ ...draft, drawer_tax_id: e.target.value })}
              />
            </div>
          </div>

          <div className="card-header !border-t">
            <div className="font-semibold">{t('effet.drawee')}</div>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">{t('effet.drawee_name')}</label>
              <input
                required
                className="input"
                value={draft.drawee_name}
                onChange={(e) => setDraft({ ...draft, drawee_name: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">{t('effet.drawee_address')}</label>
              <input
                className="input"
                value={draft.drawee_address}
                onChange={(e) => setDraft({ ...draft, drawee_address: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('effet.drawee_bank')}</label>
              <input
                className="input"
                value={draft.drawee_bank}
                onChange={(e) => setDraft({ ...draft, drawee_bank: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">{t('effet.drawee_rib')}</label>
              <input
                className="input font-mono"
                value={draft.drawee_rib}
                onChange={(e) => setDraft({ ...draft, drawee_rib: e.target.value })}
              />
            </div>
          </div>

          <div className="card-header !border-t">
            <div className="font-semibold">{t('effet.domiciliation')}</div>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('effet.domiciliation_bank')}</label>
              <input
                className="input"
                value={draft.domiciliation_bank}
                onChange={(e) => setDraft({ ...draft, domiciliation_bank: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('effet.domiciliation_address')}</label>
              <input
                className="input"
                value={draft.domiciliation_address}
                onChange={(e) => setDraft({ ...draft, domiciliation_address: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">{t('effet.notes')}</label>
              <textarea
                className="input min-h-[60px]"
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
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
              {saving ? t('common.saving') : t('effet.save_and_print')}
            </button>
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('modules.effet.title')}
        description={t('modules.effet.desc')}
        actions={
          <>
            <button onClick={() => void load()} className="btn-secondary" disabled={loading}>
              {t('common.refresh')}
            </button>
            <button onClick={startNew} className="btn-primary">
              + {t('effet.new')}
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
          <div className="font-semibold">{t('effet.list')}</div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">{t('common.loading')}</div>
          ) : docs.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">{t('effet.empty')}</div>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>{t('effet.ref_no')}</th>
                  <th>{t('effet.drawee_name')}</th>
                  <th>{t('effet.due_date')}</th>
                  <th className="text-end">{t('effet.amount')}</th>
                  <th className="text-end">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td className="font-mono text-xs">{d.data.ref_no || '—'}</td>
                    <td className="font-medium">{d.data.drawee_name}</td>
                    <td>{formatDate(d.data.due_date, i18n.language)}</td>
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

function PrintEffet({
  effet,
  company,
  lang,
  onBack,
}: {
  effet: EffetData;
  company: ReturnType<typeof useCompany.getState>['info'];
  lang: string;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const words = amountToWords(effet.amount, effet.currency, effet.words_lang);
  const formattedAmount = formatCurrency(effet.amount, effet.currency, lang);

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

      <div className="print-effet mx-auto bg-white text-slate-900 shadow print:shadow-none p-6">
        <div className="flex justify-between items-start border-b border-slate-300 pb-3 mb-4">
          <div>
            <div className="text-xs uppercase text-slate-500">{t('effet.title_doc')}</div>
            <div className="text-2xl font-bold">{t('effet.title_doc_full')}</div>
            {effet.ref_no ? (
              <div className="text-xs text-slate-500 mt-1">N° {effet.ref_no}</div>
            ) : null}
          </div>
          <div className="text-end">
            <div className="border border-slate-400 px-3 py-1 inline-block font-mono text-base">
              {formattedAmount}
            </div>
            <div className="text-xs text-slate-500 mt-2">
              {effet.place ? `${effet.place}, ` : ''}
              {formatDate(effet.issue_date, lang)}
            </div>
            <div className="text-sm font-medium mt-1">
              {t('effet.due_date')}: {formatDate(effet.due_date, lang)}
            </div>
          </div>
        </div>

        <div className="text-sm leading-relaxed mb-6">
          {effet.words_lang === 'fr' ? (
            <p>
              Contre la présente <strong>lettre de change</strong>, veuillez payer la somme de{' '}
              <em>{words}</em> ({formattedAmount}) à l'ordre de{' '}
              <strong>{effet.beneficiary_name || company.name}</strong>
              {effet.invoice_ref ? <>, en règlement de la facture {effet.invoice_ref}</> : null}.
            </p>
          ) : (
            <p>
              Against this <strong>bill of exchange</strong>, please pay the sum of <em>{words}</em>{' '}
              ({formattedAmount}) to the order of{' '}
              <strong>{effet.beneficiary_name || company.name}</strong>
              {effet.invoice_ref ? <>, in settlement of invoice {effet.invoice_ref}</> : null}.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
              {t('effet.drawee')}
            </div>
            <div className="font-medium">{effet.drawee_name}</div>
            {effet.drawee_address ? (
              <div className="text-xs text-slate-600 whitespace-pre-line">{effet.drawee_address}</div>
            ) : null}
            {effet.drawee_bank ? (
              <div className="text-xs mt-1">
                {t('effet.drawee_bank')}: {effet.drawee_bank}
              </div>
            ) : null}
            {effet.drawee_rib ? (
              <div className="text-xs font-mono">RIB / IBAN: {effet.drawee_rib}</div>
            ) : null}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
              {t('effet.domiciliation')}
            </div>
            {effet.domiciliation_bank ? <div className="font-medium">{effet.domiciliation_bank}</div> : null}
            {effet.domiciliation_address ? (
              <div className="text-xs text-slate-600 font-mono">{effet.domiciliation_address}</div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-12 text-sm">
          <div>
            <div className="border-t border-slate-400 pt-1 px-4 inline-block min-w-[12rem]">
              {effet.drawee_name}
            </div>
            <div className="text-xs text-slate-500">{t('effet.acceptance')}</div>
          </div>
          <div className="text-end">
            <div className="border-t border-slate-400 pt-1 px-4 inline-block min-w-[12rem]">
              {effet.drawer_name}
            </div>
            <div className="text-xs text-slate-500">{t('effet.drawer_signature')}</div>
          </div>
        </div>

        {effet.notes ? (
          <div className="mt-6 pt-3 border-t border-slate-200 text-xs text-slate-500 whitespace-pre-line">
            {effet.notes}
          </div>
        ) : null}
      </div>
    </div>
  );
}
