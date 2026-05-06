import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../store/auth';
import { files as filesApi, type CloudFile } from '../api/client';
import { formatBytes, formatDateTime } from '../lib/format';

/**
 * Internal SUITE app data (cheques, effets, company profile) is stored as
 * files with the `suite/` prefix. We hide those from the user-facing file
 * manager — they should be managed from the dedicated module pages instead.
 */
const APP_PREFIX = 'suite/';

export function Files() {
  const { t, i18n } = useTranslation();
  const token = useAuth((s) => s.token);
  const [items, setItems] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showInternal, setShowInternal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await filesApi.list(token);
      setItems(res.files ?? []);
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

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    setError(null);
    try {
      await filesApi.upload(token, file);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDownload = async (f: CloudFile) => {
    if (!token) return;
    setBusyId(f.id);
    try {
      const meta = await filesApi.signed(token, f.id);
      // Open in a new tab — the signed URL is valid for the requested window.
      window.open(meta.signed_url, '_blank', 'noopener');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (f: CloudFile) => {
    if (!token) return;
    if (!window.confirm(t('files.confirm_delete', { name: f.file_name }))) return;
    setBusyId(f.id);
    try {
      await filesApi.remove(token, f.id);
      setItems((xs) => xs.filter((x) => x.id !== f.id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const filtered = items
    .filter((f) => (showInternal ? true : !f.file_name.startsWith(APP_PREFIX)))
    .filter((f) =>
      search.trim() ? f.file_name.toLowerCase().includes(search.toLowerCase()) : true,
    );

  return (
    <>
      <PageHeader
        title={t('files.title')}
        description={t('files.desc')}
        actions={
          <>
            <button onClick={() => void load()} className="btn-secondary" disabled={loading}>
              {t('common.refresh')}
            </button>
            <label className="btn-primary cursor-pointer">
              {uploading ? t('files.uploading') : t('files.upload')}
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={onUpload}
                disabled={uploading}
              />
            </label>
          </>
        }
      />

      {error ? (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 mb-4">
          {error}
        </div>
      ) : null}

      <div className="card">
        <div className="card-header gap-2 flex-wrap">
          <div className="font-semibold">{t('files.your_files')}</div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-500 flex items-center gap-1">
              <input
                type="checkbox"
                checked={showInternal}
                onChange={(e) => setShowInternal(e.target.checked)}
              />
              {t('files.show_internal')}
            </label>
            <input
              type="search"
              className="input !w-64"
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">{t('common.loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">{t('files.empty')}</div>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>{t('files.name')}</th>
                  <th>{t('files.type')}</th>
                  <th className="text-end">{t('files.size')}</th>
                  <th>{t('files.created')}</th>
                  <th className="text-end">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id}>
                    <td className="font-medium text-slate-900 break-all">{f.file_name}</td>
                    <td className="text-slate-500 text-xs">{f.mime_type || '—'}</td>
                    <td className="text-end">{formatBytes(f.file_size)}</td>
                    <td className="text-slate-500 text-xs">
                      {f.created_at ? formatDateTime(f.created_at, i18n.language) : '—'}
                    </td>
                    <td className="text-end">
                      <button
                        onClick={() => void onDownload(f)}
                        className="text-brand-700 hover:underline text-sm me-3"
                        disabled={busyId === f.id}
                      >
                        {t('files.download')}
                      </button>
                      <button
                        onClick={() => void onDelete(f)}
                        className="text-red-600 hover:underline text-sm"
                        disabled={busyId === f.id}
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
