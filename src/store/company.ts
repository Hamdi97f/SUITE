/**
 * Persistent company profile (legal info, default currency, VAT rate, logo).
 *
 * Stored as a single JSON document in the user's cloud storage via the
 * SUITE files API — see `src/lib/files-store.ts`. A copy is mirrored in
 * `localStorage` so the app boots instantly on subsequent visits.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loadSingleton, saveSingleton, type DocMeta } from '../lib/files-store';

export interface CompanyInfo {
  name: string;
  legal_form: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  tax_id: string;
  registration_no: string;
  bank_name: string;
  bank_account: string;
  bank_iban: string;
  bank_swift: string;
  /** ISO 4217 currency code, e.g. TND, EUR, USD, CNY. */
  currency: string;
  /** Default VAT/sales tax percentage applied on invoices. */
  vat_rate: number;
  /** Numbering prefix used for invoices, e.g. "INV-2026-". */
  invoice_prefix: string;
  /** Default footer text printed at the bottom of invoices/receipts. */
  invoice_footer: string;
  /** Base64 data URL for the company logo (kept in the JSON to avoid signed-URL expiry). */
  logo_data_url: string;
}

export const DEFAULT_COMPANY: CompanyInfo = {
  name: '',
  legal_form: '',
  address: '',
  city: '',
  country: '',
  phone: '',
  email: '',
  website: '',
  tax_id: '',
  registration_no: '',
  bank_name: '',
  bank_account: '',
  bank_iban: '',
  bank_swift: '',
  currency: 'TND',
  vat_rate: 19,
  invoice_prefix: 'INV-',
  invoice_footer: '',
  logo_data_url: '',
};

interface CompanyState {
  info: CompanyInfo;
  meta: DocMeta | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  /** Refresh from the cloud (called on app boot once we have a token). */
  load: (token: string) => Promise<void>;
  save: (token: string, info: CompanyInfo) => Promise<void>;
  /** Mutate the in-memory info (e.g. while the user is editing). */
  setInfo: (info: CompanyInfo) => void;
}

const SINGLETON = 'company';

export const useCompany = create<CompanyState>()(
  persist(
    (set, get) => ({
      info: DEFAULT_COMPANY,
      meta: null,
      loading: false,
      saving: false,
      error: null,
      async load(token) {
        if (!token) return;
        set({ loading: true, error: null });
        try {
          const doc = await loadSingleton<CompanyInfo>(token, SINGLETON);
          if (doc) {
            set({
              info: { ...DEFAULT_COMPANY, ...doc.data },
              meta: { id: doc.id, fileId: doc.fileId, fileName: doc.fileName, size: doc.size, createdAt: doc.createdAt },
              loading: false,
            });
          } else {
            // Keep current/defaults but mark loaded.
            set({ loading: false });
          }
        } catch (e) {
          set({ loading: false, error: (e as Error).message });
        }
      },
      async save(token, info) {
        set({ saving: true, error: null });
        try {
          const meta = await saveSingleton<CompanyInfo>(token, SINGLETON, info, get().meta);
          set({ info, meta, saving: false });
        } catch (e) {
          set({ saving: false, error: (e as Error).message });
          throw e;
        }
      },
      setInfo(info) {
        set({ info });
      },
    }),
    {
      name: 'suite.company',
      partialize: (s) => ({ info: s.info, meta: s.meta }),
    },
  ),
);
