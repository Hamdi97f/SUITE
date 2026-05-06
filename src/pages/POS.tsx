import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../store/auth';
import { useCompany } from '../store/company';
import {
  orders as ordersApi,
  products as productsApi,
  categories as categoriesApi,
  type Category,
  type Order,
  type Product,
} from '../api/client';
import { formatCurrency, formatDateTime, formatNumber } from '../lib/format';

interface CartLine {
  product: Product;
  quantity: number;
}

const ALL = '__all__';

export function POS() {
  const { t, i18n } = useTranslation();
  const token = useAuth((s) => s.token);
  const company = useCompany((s) => s.info);
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string>(ALL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [paid, setPaid] = useState<number>(0);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [receipt, setReceipt] = useState<Order | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([productsApi.list(token), categoriesApi.list(token)]);
      setProducts((p.products ?? []).filter((x) => x.is_active !== false));
      setCats(c.categories ?? []);
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

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const visibleProducts = products.filter((p) => {
    if (activeCat !== ALL && p.category_id !== activeCat) return false;
    if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addToCart = (p: Product) => {
    setCart((cs) => {
      const i = cs.findIndex((c) => c.product.id === p.id);
      if (i >= 0) {
        const next = [...cs];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [...cs, { product: p, quantity: 1 }];
    });
  };

  const setQty = (productId: string, q: number) =>
    setCart((cs) =>
      q <= 0
        ? cs.filter((c) => c.product.id !== productId)
        : cs.map((c) => (c.product.id === productId ? { ...c, quantity: q } : c)),
    );

  const removeLine = (productId: string) =>
    setCart((cs) => cs.filter((c) => c.product.id !== productId));

  const clearCart = () => {
    setCart([]);
    setPaid(0);
    setCustomerEmail('');
    setCustomerName('');
  };

  const subtotal = cart.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const vatRate = company.vat_rate || 0;
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;
  const change = Math.max(0, paid - total);

  const checkout = async () => {
    if (!token || cart.length === 0) return;
    setCheckingOut(true);
    setError(null);
    try {
      const order = await ordersApi.create(token, {
        customer_name: customerName || undefined,
        customer_email: customerEmail || undefined,
        items: cart.map((l) => ({
          product_id: l.product.id,
          quantity: l.quantity,
          unit_price: l.product.price,
        })),
      });
      setReceipt(order);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCheckingOut(false);
    }
  };

  if (receipt) {
    return (
      <Receipt
        order={receipt}
        productMap={productMap}
        company={company}
        lang={i18n.language}
        paid={paid}
        change={change}
        onClose={() => {
          setReceipt(null);
          clearCart();
        }}
      />
    );
  }

  return (
    <>
      <PageHeader
        title={t('modules.pos.title')}
        description={t('modules.pos.desc')}
        actions={
          <button onClick={() => void load()} className="btn-secondary" disabled={loading}>
            {t('common.refresh')}
          </button>
        }
      />

      {error ? (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 mb-4">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Products grid */}
        <div className="lg:col-span-2 card">
          <div className="card-header gap-2 flex-wrap">
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => setActiveCat(ALL)}
                className={
                  activeCat === ALL
                    ? 'btn-primary !py-1 !px-2 text-xs'
                    : 'btn-secondary !py-1 !px-2 text-xs'
                }
              >
                {t('pos.all')}
              </button>
              {cats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={
                    activeCat === c.id
                      ? 'btn-primary !py-1 !px-2 text-xs'
                      : 'btn-secondary !py-1 !px-2 text-xs'
                  }
                >
                  {c.name}
                </button>
              ))}
            </div>
            <input
              type="search"
              className="input !w-56"
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-sm text-slate-500">{t('common.loading')}</div>
            ) : visibleProducts.length === 0 ? (
              <div className="text-sm text-slate-500">{t('pos.no_products')}</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {visibleProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="text-start border border-slate-200 rounded-md p-3 hover:border-brand-500 hover:bg-brand-50/40 transition-colors"
                  >
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-full h-20 object-cover rounded mb-2"
                      />
                    ) : (
                      <div className="w-full h-20 rounded bg-slate-100 mb-2 flex items-center justify-center text-2xl">
                        📦
                      </div>
                    )}
                    <div className="font-medium text-sm line-clamp-2">{p.name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {formatCurrency(p.price, company.currency, i18n.language)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {t('pos.stock')}: {formatNumber(p.stock, i18n.language, 0)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart */}
        <div className="card flex flex-col">
          <div className="card-header">
            <div className="font-semibold">{t('pos.cart')}</div>
            {cart.length > 0 ? (
              <button onClick={clearCart} className="text-sm text-red-600 hover:underline">
                {t('pos.clear')}
              </button>
            ) : null}
          </div>
          <div className="flex-1 overflow-y-auto max-h-96 px-5 py-3">
            {cart.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-12">{t('pos.empty')}</div>
            ) : (
              <div className="space-y-3">
                {cart.map((l) => (
                  <div key={l.product.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{l.product.name}</div>
                      <div className="text-xs text-slate-500">
                        {formatCurrency(l.product.price, company.currency, i18n.language)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setQty(l.product.id, l.quantity - 1)}
                        className="w-7 h-7 rounded border border-slate-200 text-sm"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={l.quantity}
                        onChange={(e) =>
                          setQty(l.product.id, Math.max(1, Number(e.target.value)))
                        }
                        className="input !w-12 text-center !py-1 !px-1 text-sm"
                      />
                      <button
                        onClick={() => setQty(l.product.id, l.quantity + 1)}
                        className="w-7 h-7 rounded border border-slate-200 text-sm"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-sm font-medium w-20 text-end">
                      {formatCurrency(l.product.price * l.quantity, company.currency, i18n.language)}
                    </div>
                    <button
                      onClick={() => removeLine(l.product.id)}
                      className="text-red-600 text-sm w-6"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-slate-200 px-5 py-3 space-y-1 text-sm">
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
          <div className="border-t border-slate-200 px-5 py-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input !py-1.5"
                placeholder={t('invoicing.customer_name')}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <input
                type="email"
                className="input !py-1.5"
                placeholder={t('invoicing.customer_email')}
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 items-end">
              <div>
                <label className="label !mb-0.5">{t('pos.paid')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input !py-1.5"
                  value={paid || ''}
                  onChange={(e) => setPaid(Number(e.target.value) || 0)}
                />
              </div>
              <div className="text-end">
                <div className="text-xs text-slate-500">{t('pos.change')}</div>
                <div className="font-semibold">
                  {formatCurrency(change, company.currency, i18n.language)}
                </div>
              </div>
            </div>
            <button
              disabled={cart.length === 0 || checkingOut}
              onClick={() => void checkout()}
              className="btn-primary w-full"
            >
              {checkingOut ? t('common.saving') : t('pos.checkout')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Receipt({
  order,
  productMap,
  company,
  lang,
  paid,
  change,
  onClose,
}: {
  order: Order;
  productMap: Map<string, Product>;
  company: ReturnType<typeof useCompany.getState>['info'];
  lang: string;
  paid: number;
  change: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const items = order.order_items;
  const subtotal = items.reduce((s, it) => s + it.quantity * (it.unit_price ?? 0), 0);
  const vatRate = company.vat_rate || 0;
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  return (
    <div>
      <div className="print:hidden mb-4 flex justify-between items-center">
        <button onClick={onClose} className="btn-secondary">
          ← {t('pos.new_sale')}
        </button>
        <button onClick={() => window.print()} className="btn-primary">
          🖨️ {t('common.print')}
        </button>
      </div>

      <div className="print-receipt mx-auto bg-white text-slate-900 shadow print:shadow-none p-4">
        <div className="text-center mb-3">
          {company.logo_data_url ? (
            <img src={company.logo_data_url} alt="" className="w-14 h-14 mx-auto object-contain" />
          ) : null}
          <div className="font-bold text-base">{company.name || 'SUITE POS'}</div>
          <div className="text-xs text-slate-600 whitespace-pre-line">
            {[company.address, [company.city, company.country].filter(Boolean).join(', ')]
              .filter(Boolean)
              .join('\n')}
          </div>
          {company.tax_id ? (
            <div className="text-xs text-slate-600">
              {t('settings.f.tax_id')}: {company.tax_id}
            </div>
          ) : null}
        </div>
        <div className="border-t border-dashed border-slate-400 my-2"></div>
        <div className="text-xs flex justify-between mb-1">
          <span>#{order.id.slice(0, 8).toUpperCase()}</span>
          <span>{formatDateTime(new Date(), lang)}</span>
        </div>
        {order.customer_email ? (
          <div className="text-xs text-slate-600 mb-1">{order.customer_email}</div>
        ) : null}
        <div className="border-t border-dashed border-slate-400 my-2"></div>

        <table className="w-full text-xs">
          <tbody>
            {items.map((it, i) => {
              const p = productMap.get(it.product_id);
              return (
                <tr key={i}>
                  <td className="py-0.5">
                    <div className="font-medium">{p?.name ?? it.product_id}</div>
                    <div className="text-[10px] text-slate-500">
                      {formatNumber(it.quantity, lang, 0)} ×{' '}
                      {formatCurrency(it.unit_price ?? 0, company.currency, lang)}
                    </div>
                  </td>
                  <td className="text-end align-top py-0.5">
                    {formatCurrency(it.quantity * (it.unit_price ?? 0), company.currency, lang)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="border-t border-dashed border-slate-400 my-2"></div>
        <div className="text-xs space-y-0.5">
          <div className="flex justify-between">
            <span>{t('invoicing.subtotal')}</span>
            <span>{formatCurrency(subtotal, company.currency, lang)}</span>
          </div>
          <div className="flex justify-between">
            <span>
              {t('invoicing.vat')} {formatNumber(vatRate, lang, 2)}%
            </span>
            <span>{formatCurrency(vatAmount, company.currency, lang)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm border-t border-slate-400 pt-1">
            <span>{t('invoicing.total')}</span>
            <span>{formatCurrency(total, company.currency, lang)}</span>
          </div>
          {paid > 0 ? (
            <>
              <div className="flex justify-between">
                <span>{t('pos.paid')}</span>
                <span>{formatCurrency(paid, company.currency, lang)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('pos.change')}</span>
                <span>{formatCurrency(change, company.currency, lang)}</span>
              </div>
            </>
          ) : null}
        </div>

        {company.invoice_footer ? (
          <>
            <div className="border-t border-dashed border-slate-400 my-2"></div>
            <div className="text-[10px] text-center text-slate-500 whitespace-pre-line">
              {company.invoice_footer}
            </div>
          </>
        ) : null}

        <div className="text-center text-[10px] text-slate-500 mt-3">{t('pos.thanks')}</div>
      </div>
    </div>
  );
}
