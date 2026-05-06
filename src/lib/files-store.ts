/**
 * Generic JSON-document store backed by the SUITE file API.
 *
 * The cloud API only exposes raw file storage (`/upload-file`, `/list-files`,
 * `/files/:id`, `/delete-file`) and does not yet provide tables for cheques,
 * effets bancaires, or company profile. We simulate a tiny document database
 * by storing each record as a JSON file with a deterministic name:
 *
 *     suite/<collection>/<id>.json
 *
 * Records are listed by filtering `/list-files` results on the prefix, and
 * loaded by fetching the signed URL returned by `/files/:id`.
 *
 * This makes the data persistent, multi-device, and shared with the user's
 * cloud account — exactly like the rest of the modules.
 */

import { files as filesApi, type CloudFile } from '../api/client';

const ROOT = 'suite';

export interface DocMeta {
  id: string;
  fileId: string;
  fileName: string;
  size: number;
  createdAt?: string;
}

export interface Doc<T> extends DocMeta {
  data: T;
}

/** Stable unique id without external deps (RFC4122-ish, good enough for filenames). */
export function newId(): string {
  // crypto.randomUUID is available in all evergreen browsers.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function fileName(collection: string, id: string): string {
  return `${ROOT}/${collection}/${id}.json`;
}

function parseId(collection: string, name: string): string | null {
  const prefix = `${ROOT}/${collection}/`;
  if (!name.startsWith(prefix)) return null;
  const rest = name.slice(prefix.length);
  if (!rest.endsWith('.json')) return null;
  return rest.slice(0, -'.json'.length);
}

function metaFromFile(collection: string, f: CloudFile): DocMeta | null {
  const id = parseId(collection, f.file_name);
  if (!id) return null;
  return {
    id,
    fileId: f.id,
    fileName: f.file_name,
    size: f.file_size,
    createdAt: f.created_at,
  };
}

export async function listDocs(token: string, collection: string): Promise<DocMeta[]> {
  const { files: all } = await filesApi.list(token);
  return all
    .map((f) => metaFromFile(collection, f))
    .filter((m): m is DocMeta => m !== null)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function loadDoc<T>(token: string, meta: DocMeta): Promise<Doc<T>> {
  const text = await filesApi.fetchText(token, meta.fileId);
  const data = JSON.parse(text) as T;
  return { ...meta, data };
}

export async function listAndLoad<T>(token: string, collection: string): Promise<Doc<T>[]> {
  const metas = await listDocs(token, collection);
  // Loading in parallel — these resolve to small JSON blobs.
  return Promise.all(metas.map((m) => loadDoc<T>(token, m)));
}

/**
 * Save a document. If `existing` is provided, the previous file is deleted first
 * so storage usage stays accurate (the API has no in-place file replace).
 */
export async function saveDoc<T>(
  token: string,
  collection: string,
  id: string,
  data: T,
  existing?: DocMeta | null,
): Promise<DocMeta> {
  const name = fileName(collection, id);
  if (existing?.fileId) {
    try {
      await filesApi.remove(token, existing.fileId);
    } catch {
      /* If deletion fails, still upload the new version. */
    }
  }
  const res = await filesApi.uploadBlob(token, name, JSON.stringify(data, null, 2));
  return {
    id,
    fileId: res.file_id,
    fileName: res.file_name,
    size: res.file_size,
    createdAt: new Date().toISOString(),
  };
}

export async function deleteDoc(token: string, meta: DocMeta): Promise<void> {
  await filesApi.remove(token, meta.fileId);
}

/** Convenience: load a single named "singleton" document (used for company profile). */
export async function loadSingleton<T>(
  token: string,
  name: string,
): Promise<Doc<T> | null> {
  const collection = `singletons`;
  const fullName = `${ROOT}/${collection}/${name}.json`;
  const { files: all } = await filesApi.list(token);
  const f = all.find((x) => x.file_name === fullName);
  if (!f) return null;
  const meta: DocMeta = {
    id: name,
    fileId: f.id,
    fileName: f.file_name,
    size: f.file_size,
    createdAt: f.created_at,
  };
  return loadDoc<T>(token, meta);
}

export async function saveSingleton<T>(
  token: string,
  name: string,
  data: T,
  existing?: DocMeta | null,
): Promise<DocMeta> {
  return saveDoc<T>(token, 'singletons', name, data, existing);
}
