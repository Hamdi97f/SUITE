import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../store/auth';
import {
  products as productsApi,
  categories as categoriesApi,
  type Product,
  type Category,
} from '../api/client';

export function Inventory() {
  const { t } = useTranslation();
  const token = useAuth((s) => s.token);

  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([productsApi.list(token), categoriesApi.list(token)]);
      setProducts(p.products ?? []);
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

  const catName = (id?: string | null) => cats.find((c) => c.id === id)?.name ?? '—';
  const filtered = products.filter((p) =>
    search.trim() ? p.name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <>
      <PageHeader
        title={t('modules.inventory.title')}
        description={t('modules.inventory.desc')}
        actions={
          <button onClick={() => void load()} className="btn-secondary">
            {t('common.refresh')}
          </button>
        }
      />

      <div className="card">
        <div className="card-header">
          <div className="font-semibold">{t('modules.inventory.products')}</div>
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
            <div className="p-6 text-sm text-slate-500">{t('modules.inventory.loading')}</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">
              {t('modules.inventory.error')} — {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">{t('modules.inventory.no_products')}</div>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>{t('modules.inventory.name')}</th>
                  <th>{t('modules.inventory.category')}</th>
                  <th className="text-end">{t('modules.inventory.price')}</th>
                  <th className="text-end">{t('modules.inventory.stock')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="font-medium text-slate-900">{p.name}</div>
                      {p.description ? (
                        <div className="text-xs text-slate-500 line-clamp-1">{p.description}</div>
                      ) : null}
                    </td>
                    <td className="text-slate-600">{catName(p.category_id)}</td>
                    <td className="text-end font-medium">
                      {Number(p.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-end">
                      <span
                        className={
                          p.stock > 0
                            ? 'inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-medium'
                            : 'inline-block px-2 py-0.5 rounded bg-red-50 text-red-700 text-xs font-medium'
                        }
                      >
                        {p.stock}
                      </span>
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
