import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../store/auth';
import { useCompany } from '../store/company';
import {
  orders as ordersApi,
  products as productsApi,
  type Order,
  type OrderItem,
  type Product,
} from '../api/client';
import {
  amountToWords,
  formatCurrency,
  formatDate,
  formatNumber,
} from '../lib/format';

interface DraftItem {
  product_id: string;
  quantity: number;
  unit_price: number;
}

interface DraftInvoice {
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  notes: string;
  items: DraftItem[];
}

const EMPTY_DRAFT: DraftInvoice = {
  customer_name: '',
  customer_email: '',
  shipping_address: '',
  notes: '',
  items: [],
};

export function Invoicing() {
  const { t, i18n } = useTranslation();
  const token = useAuth((s) => s.token);
  const company = useCompany((s) => s.info);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'edit' | 'print'>('list');
  const [draft, setDraft] = useState<DraftInvoice>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [o, p] = await Promise.all([ordersApi.list(token), productsApi.list(token)]);
      setOrders(o.orders ?? []);
      setProducts(p.products ?? []);
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
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setView('edit');
  };

  const startEdit = (o: Order) => {
    setDraft({
      customer_name: '',
      customer_email: o.customer_email ?? '',
      shipping_address: '',
      notes: '',
      items: o.order_items.map((it) => ({
        product_id: it.product_id,
        quantity: it.quantity,
        unit_price: it.unit_price ?? productMap.get(it.product_id)?.price ?? 0,
      })),
    });
    setEditingId(o.id);
    setView('edit');
  };

  const addItem = () => {
    if (products.length === 0) return;
    const first = products[0];
    setDraft((d) => ({
      ...d,
      items: [...d.items, { product_id: first.id, quantity: 1, unit_price: first.price }],
    }));
  };

  const removeItem = (idx: number) =>
    setDraft((d) => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));

  const updateItem = (idx: number, patch: Partial<DraftItem>) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((it, i) => {
        if (i !== idx) return it;
        const merged = { ...it, ...patch };
        if (patch.product_id && patch.product_id !== it.product_id) {
          const p = productMap.get(patch.product_id);
          if (p) merged.unit_price = p.price;
        }
        return merged;
      }),
    }));

  const subtotal = draft.items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const vatRate = company.vat_rate || 0;
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (draft.items.length === 0) {
      setError(t('invoicing.no_items'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let saved: Order;
      const payload = {
        customer_name: draft.customer_name || undefined,
        customer_email: draft.customer_email || undefined,
        shipping_address: draft.shipping_address || undefined,
        notes: draft.notes || undefined,
        items: draft.items.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price: it.unit_price,
        })),
      };
      if (editingId) {
        saved = await ordersApi.update(token, editingId, payload);
      } else {
        saved = await ordersApi.create(token, { ...payload, items: payload.items });
      }
      await load();
      setPrintOrder(saved);
      setView('print');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const print = (o: Order) => {
    setPrintOrder(o);
    setView('print');
  };

  const filtered = orders.filter((o) =>
    search.trim()
      ? (o.customer_email || '').toLowerCase().includes(search.toLowerCase()) ||
        o.id.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  /* -------------------------- Print view -------------------------- */
  if (view === 'print' && printOrder) {
    return (
      <PrintInvoice
        order={printOrder}
        productMap={productMap}
        company={company}
        lang={i18n.language}
        onBack={() => {
          setView('list');
          setPrintOrder(null);
        }}
      />
    );
  }

  /* -------------------------- Edit view --------------------------- */
  if (view === 'edit') {
    return (
      <>
        <PageHeader
          title={editingId ? t('invoicing.edit_title') : t('invoicing.new_title')}
          description={t('invoicing.edit_desc')}
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

        <form onSubmit={submit} className="card mb-4">
          <div className="card-header">
            <div className="font-semibold">{t('invoicing.customer')}</div>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('invoicing.customer_name')}</label>
              <input
                className="input"
                value={draft.customer_name}
                onChange={(e) => setDraft({ ...draft, customer_name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('invoicing.customer_email')}</label>
              <input
                type="email"
                className="input"
                value={draft.customer_email}
                onChange={(e) => setDraft({ ...draft, customer_email: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">{t('invoicing.shipping_address')}</label>
              <input
                className="input"
                value={draft.shipping_address}
                onChange={(e) => setDraft({ ...draft, shipping_address: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">{t('invoicing.notes')}</label>
              <textarea
                className="input min-h-[60px]"
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="card-header !border-t">
            <div className="font-semibold">{t('invoicing.items')}</div>
            <button type="button" onClick={addItem} className="btn-secondary !py-1.5">
              + {t('invoicing.add_item')}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>{t('invoicing.product')}</th>
                  <th className="text-end w-24">{t('invoicing.qty')}</th>
                  <th className="text-end w-32">{t('invoicing.unit_price')}</th>
                  <th className="text-end w-32">{t('invoicing.line_total')}</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {draft.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-slate-500 text-sm py-6 text-center">
                      {t('invoicing.no_items_yet')}
                    </td>
                  </tr>
                ) : (
                  draft.items.map((it, i) => (
                    <tr key={i}>
                      <td>
                        <select
                          className="input"
                          value={it.product_id}
                          onChange={(e) => updateItem(i, { product_id: e.target.value })}
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-end">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          className="input text-end"
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(i, { quantity: Math.max(1, Number(e.target.value)) })
                          }
                        />
                      </td>
                      <td className="text-end">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="input text-end"
                          value={it.unit_price}
                          onChange={(e) =>
                            updateItem(i, { unit_price: Math.max(0, Number(e.target.value)) })
                          }
                        />
                      </td>
                      <td className="text-end font-medium">
                        {formatCurrency(it.quantity * it.unit_price, company.currency, i18n.language)}
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200">
            <div></div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">{t('invoicing.subtotal')}</span>
                <span>{formatCurrency(subtotal, company.currency, i18n.language)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">
                  {t('invoicing.vat')} ({formatNumber(vatRate, i18n.language, 2)}%)
                </span>
                <span>{formatCurrency(vatAmount, company.currency, i18n.language)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-semibold text-base">
                <span>{t('invoicing.total')}</span>
                <span>{formatCurrency(total, company.currency, i18n.language)}</span>
              </div>
            </div>
          </div>

          <div className="card-header !border-t !border-b-0 justify-end gap-2">
            <button type="button" onClick={() => setView('list')} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? t('common.saving') : t('invoicing.save_and_print')}
            </button>
          </div>
        </form>
      </>
    );
  }

  /* -------------------------- List view --------------------------- */
  return (
    <>
      <PageHeader
        title={t('modules.invoicing.title')}
        description={t('modules.invoicing.desc')}
        actions={
          <>
            <button onClick={() => void load()} className="btn-secondary" disabled={loading}>
              {t('common.refresh')}
            </button>
            <button onClick={startNew} className="btn-primary">
              + {t('invoicing.new')}
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
          <div className="font-semibold">{t('invoicing.list')}</div>
          <input
            type="search"
            className="input !w-64"
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">{t('common.loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">{t('invoicing.empty')}</div>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>{t('invoicing.invoice_no')}</th>
                  <th>{t('invoicing.customer')}</th>
                  <th>{t('invoicing.status')}</th>
                  <th className="text-end">{t('invoicing.total')}</th>
                  <th className="text-end">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id}>
                    <td className="font-mono text-xs">
                      {company.invoice_prefix}
                      {o.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td>{o.customer_email || '—'}</td>
                    <td>
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                        {o.status}
                      </span>
                    </td>
                    <td className="text-end font-medium">
                      {formatCurrency(Number(o.total), company.currency, i18n.language)}
                    </td>
                    <td className="text-end">
                      <button
                        onClick={() => print(o)}
                        className="text-brand-700 hover:underline text-sm me-3"
                      >
                        {t('invoicing.print')}
                      </button>
                      <button
                        onClick={() => startEdit(o)}
                        className="text-slate-700 hover:underline text-sm"
                      >
                        {t('common.edit')}
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

/* -------------------------------------------------------------------------- */
/*                              Print invoice                                  */
/* -------------------------------------------------------------------------- */

function PrintInvoice({
  order,
  productMap,
  company,
  lang,
  onBack,
}: {
  order: Order;
  productMap: Map<string, Product>;
  company: ReturnType<typeof useCompany.getState>['info'];
  lang: string;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const items: OrderItem[] = order.order_items;
  const subtotal = items.reduce((s, it) => s + it.quantity * (it.unit_price ?? 0), 0);
  const vatRate = company.vat_rate || 0;
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;
  const wordsLang: 'fr' | 'en' = lang.startsWith('fr') ? 'fr' : 'en';

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

      <div className="print-page mx-auto bg-white text-slate-900 shadow print:shadow-none">
        <div className="flex justify-between items-start gap-6 mb-8">
          <div className="flex items-center gap-4">
            {company.logo_data_url ? (
              <img src={company.logo_data_url} alt="logo" className="w-20 h-20 object-contain" />
            ) : null}
            <div>
              <div className="text-xl font-bold">{company.name || t('settings.company')}</div>
              {company.legal_form ? (
                <div className="text-xs text-slate-500">{company.legal_form}</div>
              ) : null}
              <div className="text-xs text-slate-600 mt-1 whitespace-pre-line">
                {[company.address, [company.city, company.country].filter(Boolean).join(', ')]
                  .filter(Boolean)
                  .join('\n')}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {[company.phone, company.email, company.website].filter(Boolean).join(' · ')}
              </div>
              {company.tax_id ? (
                <div className="text-xs text-slate-600 mt-1">
                  {t('settings.f.tax_id')}: <span className="font-mono">{company.tax_id}</span>
                </div>
              ) : null}
            </div>
          </div>
          <div className="text-end">
            <div className="text-2xl font-bold uppercase tracking-wide text-brand-700">
              {t('invoicing.invoice')}
            </div>
            <div className="text-sm mt-2 font-mono">
              {company.invoice_prefix}
              {order.id.slice(0, 8).toUpperCase()}
            </div>
            <div className="text-xs text-slate-500 mt-1">{formatDate(new Date(), lang)}</div>
            <div className="text-xs text-slate-500 mt-1">
              {t('invoicing.status')}:{' '}
              <span className="font-medium capitalize">{order.status}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
              {t('invoicing.bill_to')}
            </div>
            <div className="text-sm font-medium">{order.customer_email || '—'}</div>
          </div>
          <div className="text-end">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
              {t('invoicing.payment')}
            </div>
            {company.bank_name ? <div className="text-sm">{company.bank_name}</div> : null}
            {company.bank_iban ? (
              <div className="text-xs text-slate-600 font-mono">IBAN: {company.bank_iban}</div>
            ) : null}
            {company.bank_swift ? (
              <div className="text-xs text-slate-600 font-mono">SWIFT: {company.bank_swift}</div>
            ) : null}
          </div>
        </div>

        <table className="w-full text-sm border-t border-b border-slate-300">
          <thead>
            <tr className="border-b border-slate-300 text-xs uppercase tracking-wider text-slate-600">
              <th className="text-start py-2">{t('invoicing.product')}</th>
              <th className="text-end py-2 w-20">{t('invoicing.qty')}</th>
              <th className="text-end py-2 w-32">{t('invoicing.unit_price')}</th>
              <th className="text-end py-2 w-32">{t('invoicing.line_total')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => {
              const p = productMap.get(it.product_id);
              const line = it.quantity * (it.unit_price ?? 0);
              return (
                <tr key={i} className="border-b border-slate-100 align-top">
                  <td className="py-2">
                    <div className="font-medium">{p?.name ?? it.product_id}</div>
                    {p?.description ? (
                      <div className="text-xs text-slate-500">{p.description}</div>
                    ) : null}
                  </td>
                  <td className="text-end py-2">{formatNumber(it.quantity, lang, 0)}</td>
                  <td className="text-end py-2">
                    {formatCurrency(it.unit_price ?? 0, company.currency, lang)}
                  </td>
                  <td className="text-end py-2 font-medium">
                    {formatCurrency(line, company.currency, lang)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-6 mt-4">
          <div>
            {order.customer_email ? (
              <div className="text-xs text-slate-500">
                {t('invoicing.amount_in_words')}:{' '}
                <span className="italic">{amountToWords(total, company.currency, wordsLang)}</span>
              </div>
            ) : null}
          </div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">{t('invoicing.subtotal')}</span>
              <span>{formatCurrency(subtotal, company.currency, lang)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">
                {t('invoicing.vat')} ({formatNumber(vatRate, lang, 2)}%)
              </span>
              <span>{formatCurrency(vatAmount, company.currency, lang)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-1 font-bold text-base">
              <span>{t('invoicing.total')}</span>
              <span>{formatCurrency(total, company.currency, lang)}</span>
            </div>
          </div>
        </div>

        {company.invoice_footer ? (
          <div className="mt-12 pt-4 border-t border-slate-200 text-xs text-slate-500 whitespace-pre-line text-center">
            {company.invoice_footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
