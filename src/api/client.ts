/**
 * Thin wrapper around the SUITE API gateway.
 *
 * All requests:
 *   - Include the project API key in the `x-api-key` header.
 *   - Include `Authorization: Bearer <token>` once the user is logged in.
 *
 * The base URL and API key are read from Vite environment variables
 * (`VITE_API_BASE_URL`, `VITE_API_KEY`). See `.env.example`.
 */

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://hycvkzijiwnmcwejvugj.supabase.co/functions/v1/api-gateway';
const API_KEY = import.meta.env.VITE_API_KEY || '';

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  query?: Record<string, string | number | undefined>;
  /** When set, send `body` as FormData (do not JSON-stringify). */
  formData?: FormData;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, query, formData, signal } = opts;

  const headers: Record<string, string> = {
    'x-api-key': API_KEY,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: payload,
    signal,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data: unknown = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const message =
      (isJson && data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)
        ? String((data as Record<string, unknown>).error)
        : null) || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

/* -------------------------------------------------------------------------- */
/*                              Typed endpoints                                */
/* -------------------------------------------------------------------------- */

export interface AuthUser {
  user_id: string;
  email: string;
  is_admin?: boolean;
}

export interface LoginResponse extends AuthUser {
  token: string;
  is_admin: boolean;
}

export const auth = {
  register: (email: string, password: string) =>
    request<AuthUser>('/register', { method: 'POST', body: { email, password } }),
  login: (email: string, password: string) =>
    request<LoginResponse>('/login', { method: 'POST', body: { email, password } }),
};

export interface UserProfile {
  user_id: string;
  email: string;
  is_admin: boolean;
  storage_used: number;
  storage_limit: number;
  subscription_status: string;
  subscription_end: string;
  last_login: string;
}

export const user = {
  me: (token: string) => request<UserProfile>('/user', { token }),
  update: (token: string, body: { email?: string; password?: string }) =>
    request<{ success: boolean }>('/update-user', { method: 'POST', token, body }),
  storage: (token: string) =>
    request<{ storage_used: number; storage_limit: number; usage_percent: string }>(
      '/storage',
      { token },
    ),
  subscription: (token: string) =>
    request<{ status: string; start: string; end: string; payment_status: string }>(
      '/subscription-status',
      { token },
    ),
};

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export const categories = {
  list: (token: string) => request<{ categories: Category[] }>('/categories', { token }),
  create: (token: string, body: { name: string; description?: string }) =>
    request<Category>('/categories', { method: 'POST', token, body }),
  update: (token: string, id: string, body: Partial<Category>) =>
    request<Category>(`/categories/${id}`, { method: 'PUT', token, body }),
  remove: (token: string, id: string) =>
    request<{ success: boolean }>(`/categories/${id}`, { method: 'DELETE', token }),
};

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  category_id?: string | null;
  image_url?: string | null;
  is_active?: boolean;
}

export const products = {
  list: (token: string) => request<{ products: Product[] }>('/products', { token }),
  get: (token: string, id: string) => request<Product>(`/products/${id}`, { token }),
  create: (token: string, body: Partial<Product>) =>
    request<Product>('/products', { method: 'POST', token, body }),
  update: (token: string, id: string, body: Partial<Product>) =>
    request<Product>(`/products/${id}`, { method: 'PUT', token, body }),
  remove: (token: string, id: string) =>
    request<{ success: boolean }>(`/products/${id}`, { method: 'DELETE', token }),
  uploadImage: (token: string, id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<{ image_url: string; product: Product }>(`/products/${id}/image`, {
      method: 'POST',
      token,
      formData: fd,
    });
  },
};

export interface OrderItem {
  product_id: string;
  quantity: number;
  unit_price?: number;
}

export interface Order {
  id: string;
  status: string;
  total: number;
  customer_email?: string;
  order_items: OrderItem[];
}

export const orders = {
  list: (token: string) => request<{ orders: Order[] }>('/orders', { token }),
  get: (token: string, id: string) => request<Order>(`/orders/${id}`, { token }),
  create: (
    token: string,
    body: {
      customer_name?: string;
      customer_email?: string;
      shipping_address?: string;
      notes?: string;
      items: OrderItem[];
    },
  ) => request<Order>('/orders', { method: 'POST', token, body }),
  update: (token: string, id: string, body: Partial<Order> & { items?: OrderItem[] }) =>
    request<Order>(`/orders/${id}`, { method: 'PUT', token, body }),
};

/* -------------------------------------------------------------------------- */
/*                                   Files                                     */
/* -------------------------------------------------------------------------- */

export interface CloudFile {
  id: string;
  file_name: string;
  file_size: number;
  mime_type?: string;
  created_at?: string;
}

export interface SignedFile extends CloudFile {
  signed_url: string;
  expires_in: number;
}

export const files = {
  list: (token: string) => request<{ files: CloudFile[] }>('/list-files', { token }),
  upload: (token: string, file: File, fileName?: string) => {
    const fd = new FormData();
    // The gateway accepts either the underlying File name or a renamed Blob;
    // when fileName is provided we wrap the File so the server stores that name.
    if (fileName && fileName !== file.name) {
      fd.append('file', new File([file], fileName, { type: file.type }));
    } else {
      fd.append('file', file);
    }
    return request<{ file_id: string; file_name: string; file_size: number }>(
      '/upload-file',
      { method: 'POST', token, formData: fd },
    );
  },
  /** Upload arbitrary text/JSON as a file under the given filename. */
  uploadBlob: (token: string, fileName: string, content: string, mime = 'application/json') => {
    const fd = new FormData();
    fd.append('file', new File([content], fileName, { type: mime }));
    return request<{ file_id: string; file_name: string; file_size: number }>(
      '/upload-file',
      { method: 'POST', token, formData: fd },
    );
  },
  remove: (token: string, fileId: string) =>
    request<{ success: boolean }>('/delete-file', {
      method: 'DELETE',
      token,
      query: { file_id: fileId },
    }),
  signed: (token: string, fileId: string, expiresIn = 3600) =>
    request<SignedFile>(`/files/${fileId}`, { token, query: { expires_in: expiresIn } }),
  /** Fetches the file via its signed URL and returns the body as text. */
  async fetchText(token: string, fileId: string): Promise<string> {
    const meta = await files.signed(token, fileId);
    const res = await fetch(meta.signed_url);
    if (!res.ok) throw new ApiError(`Failed to download file ${fileId}`, res.status, null);
    return res.text();
  },
};

export const config = {
  get baseUrl() {
    return BASE_URL;
  },
  get hasApiKey() {
    return Boolean(API_KEY);
  },
};
