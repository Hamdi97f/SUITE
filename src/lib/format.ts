/**
 * Locale-aware formatting helpers used across SUITE.
 *
 * Currency, date, and number formatting are derived from the user's selected
 * UI language (en, fr, ar, es, it, hi, zh) plus a per-company default currency
 * (TND, EUR, CNY, USD …). Amount-to-words is provided in French and English
 * because that's what is required for hand-printed cheques in TN/FR and
 * US/UK respectively.
 */

import type { LanguageCode } from '../i18n';

export interface CurrencyInfo {
  code: string;
  /** ISO 4217 / common symbol */
  symbol: string;
  /** A friendly label suitable for a dropdown */
  label: string;
  /** Country flag emoji */
  flag: string;
  /** Best-fit BCP-47 locale used when no UI locale is given */
  defaultLocale: string;
  /** Number of fraction digits to display */
  fractionDigits: number;
  /** Singular/plural words for amount-to-words (FR + EN) */
  words: {
    fr: { major: [string, string]; minor: [string, string] };
    en: { major: [string, string]; minor: [string, string] };
  };
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  {
    code: 'TND',
    symbol: 'TND',
    label: 'Tunisian Dinar (TND)',
    flag: '🇹🇳',
    defaultLocale: 'fr-TN',
    fractionDigits: 3,
    words: {
      fr: { major: ['dinar', 'dinars'], minor: ['millime', 'millimes'] },
      en: { major: ['dinar', 'dinars'], minor: ['millime', 'millimes'] },
    },
  },
  {
    code: 'EUR',
    symbol: '€',
    label: 'Euro (€)',
    flag: '🇪🇺',
    defaultLocale: 'fr-FR',
    fractionDigits: 2,
    words: {
      fr: { major: ['euro', 'euros'], minor: ['centime', 'centimes'] },
      en: { major: ['euro', 'euros'], minor: ['cent', 'cents'] },
    },
  },
  {
    code: 'USD',
    symbol: '$',
    label: 'US Dollar ($)',
    flag: '🇺🇸',
    defaultLocale: 'en-US',
    fractionDigits: 2,
    words: {
      fr: { major: ['dollar', 'dollars'], minor: ['cent', 'cents'] },
      en: { major: ['dollar', 'dollars'], minor: ['cent', 'cents'] },
    },
  },
  {
    code: 'CNY',
    symbol: '¥',
    label: 'Chinese Yuan (¥)',
    flag: '🇨🇳',
    defaultLocale: 'zh-CN',
    fractionDigits: 2,
    words: {
      fr: { major: ['yuan', 'yuans'], minor: ['fen', 'fen'] },
      en: { major: ['yuan', 'yuan'], minor: ['fen', 'fen'] },
    },
  },
  {
    code: 'GBP',
    symbol: '£',
    label: 'British Pound (£)',
    flag: '🇬🇧',
    defaultLocale: 'en-GB',
    fractionDigits: 2,
    words: {
      fr: { major: ['livre', 'livres'], minor: ['penny', 'pence'] },
      en: { major: ['pound', 'pounds'], minor: ['penny', 'pence'] },
    },
  },
  {
    code: 'CHF',
    symbol: 'CHF',
    label: 'Swiss Franc (CHF)',
    flag: '🇨🇭',
    defaultLocale: 'fr-CH',
    fractionDigits: 2,
    words: {
      fr: { major: ['franc', 'francs'], minor: ['centime', 'centimes'] },
      en: { major: ['franc', 'francs'], minor: ['centime', 'centimes'] },
    },
  },
  {
    code: 'MAD',
    symbol: 'MAD',
    label: 'Moroccan Dirham (MAD)',
    flag: '🇲🇦',
    defaultLocale: 'fr-MA',
    fractionDigits: 2,
    words: {
      fr: { major: ['dirham', 'dirhams'], minor: ['centime', 'centimes'] },
      en: { major: ['dirham', 'dirhams'], minor: ['centime', 'centimes'] },
    },
  },
  {
    code: 'AED',
    symbol: 'AED',
    label: 'UAE Dirham (AED)',
    flag: '🇦🇪',
    defaultLocale: 'ar-AE',
    fractionDigits: 2,
    words: {
      fr: { major: ['dirham', 'dirhams'], minor: ['fils', 'fils'] },
      en: { major: ['dirham', 'dirhams'], minor: ['fils', 'fils'] },
    },
  },
];

export function getCurrency(code: string | undefined): CurrencyInfo {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) ?? SUPPORTED_CURRENCIES[0];
}

/** Map a UI language code to a sensible BCP-47 locale. */
export function uiLocale(lang: string | undefined): string {
  switch ((lang || 'en').split('-')[0] as LanguageCode) {
    case 'fr':
      return 'fr-FR';
    case 'ar':
      return 'ar-TN';
    case 'es':
      return 'es-ES';
    case 'it':
      return 'it-IT';
    case 'hi':
      return 'hi-IN';
    case 'zh':
      return 'zh-CN';
    case 'en':
    default:
      return 'en-US';
  }
}

export function formatCurrency(
  amount: number,
  currencyCode: string,
  lang?: string,
): string {
  const info = getCurrency(currencyCode);
  const locale = uiLocale(lang);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: info.code,
      minimumFractionDigits: info.fractionDigits,
      maximumFractionDigits: info.fractionDigits,
    }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    // Fallback for unsupported currency codes in older runtimes
    return `${info.symbol} ${amount.toFixed(info.fractionDigits)}`;
  }
}

export function formatNumber(amount: number, lang?: string, fractionDigits = 2): string {
  return new Intl.NumberFormat(uiLocale(lang), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(d: string | number | Date | undefined | null, lang?: string): string {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(uiLocale(lang), { dateStyle: 'medium' }).format(date);
}

export function formatDateTime(
  d: string | number | Date | undefined | null,
  lang?: string,
): string {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(uiLocale(lang), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

/* -------------------------------------------------------------------------- */
/*                            Amount → words (FR/EN)                           */
/* -------------------------------------------------------------------------- */

const FR_UNITS = [
  '',
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
  'dix-sept',
  'dix-huit',
  'dix-neuf',
];
const FR_TENS = [
  '',
  '',
  'vingt',
  'trente',
  'quarante',
  'cinquante',
  'soixante',
  'soixante',
  'quatre-vingt',
  'quatre-vingt',
];

function frBelow100(n: number): string {
  if (n < 20) return FR_UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 7 || t === 9) {
    const base = FR_TENS[t];
    const sub = FR_UNITS[10 + u];
    return base + '-' + sub;
  }
  if (t === 8 && u === 0) return 'quatre-vingts';
  let out = FR_TENS[t];
  if (u === 1 && t !== 8) out += ' et un';
  else if (u > 0) out += '-' + FR_UNITS[u];
  return out;
}

function frBelow1000(n: number): string {
  if (n === 0) return '';
  const h = Math.floor(n / 100);
  const r = n % 100;
  let out = '';
  if (h === 1) out = 'cent';
  else if (h > 1) out = FR_UNITS[h] + ' cent' + (r === 0 ? 's' : '');
  if (r > 0) out = (out ? out + ' ' : '') + frBelow100(r);
  return out;
}

function frInteger(n: number): string {
  if (n === 0) return 'zéro';
  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (billions > 0)
    parts.push((billions === 1 ? 'un' : frBelow1000(billions)) + ' milliard' + (billions > 1 ? 's' : ''));
  if (millions > 0)
    parts.push((millions === 1 ? 'un' : frBelow1000(millions)) + ' million' + (millions > 1 ? 's' : ''));
  if (thousands > 0) {
    parts.push(thousands === 1 ? 'mille' : frBelow1000(thousands) + ' mille');
  }
  if (rest > 0) parts.push(frBelow1000(rest));
  return parts.join(' ');
}

const EN_UNITS = [
  '',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const EN_TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
];

function enBelow100(n: number): string {
  if (n < 20) return EN_UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return EN_TENS[t] + (u ? '-' + EN_UNITS[u] : '');
}

function enBelow1000(n: number): string {
  if (n === 0) return '';
  const h = Math.floor(n / 100);
  const r = n % 100;
  let out = '';
  if (h > 0) out = EN_UNITS[h] + ' hundred';
  if (r > 0) out += (out ? ' and ' : '') + enBelow100(r);
  return out;
}

function enInteger(n: number): string {
  if (n === 0) return 'zero';
  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (billions > 0) parts.push(enBelow1000(billions) + ' billion');
  if (millions > 0) parts.push(enBelow1000(millions) + ' million');
  if (thousands > 0) parts.push(enBelow1000(thousands) + ' thousand');
  if (rest > 0) parts.push(enBelow1000(rest));
  return parts.join(' ');
}

/**
 * Convert a monetary amount to a written form, suitable for the body of a cheque.
 * Supports French ("fr") and English ("en"). The minor-unit name is taken from
 * the currency. Negative amounts are formatted with a leading "moins" / "minus".
 */
export function amountToWords(
  amount: number,
  currencyCode: string,
  lang: 'fr' | 'en' = 'fr',
): string {
  const info = getCurrency(currencyCode);
  const sign = amount < 0 ? (lang === 'fr' ? 'moins ' : 'minus ') : '';
  const abs = Math.abs(amount);
  const factor = Math.pow(10, info.fractionDigits);
  // Round to currency precision before splitting major / minor units.
  const cents = Math.round(abs * factor);
  const major = Math.floor(cents / factor);
  const minor = cents - major * factor;

  const words = info.words[lang];
  const intToWords = lang === 'fr' ? frInteger : enInteger;

  const majorStr = `${intToWords(major)} ${major === 1 ? words.major[0] : words.major[1]}`;
  if (minor === 0) return (sign + majorStr).trim();
  const minorStr = `${intToWords(minor)} ${minor === 1 ? words.minor[0] : words.minor[1]}`;
  const conn = lang === 'fr' ? ' et ' : ' and ';
  return (sign + majorStr + conn + minorStr).trim();
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
