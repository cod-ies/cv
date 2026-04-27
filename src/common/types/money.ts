import Decimal from 'decimal.js';

/**
 * All monetary values in the system are stored and passed as BigInt euro-cents.
 * This eliminates floating-point rounding errors in tax and SV calculations.
 */
export type EuroCents = bigint;

export function centsFromDecimal(d: Decimal): EuroCents {
  return BigInt(d.times(100).toFixed(0));
}

export function decimalFromCents(cents: EuroCents): Decimal {
  return new Decimal(cents.toString()).dividedBy(100);
}

export function centsFromEuros(euros: number | string): EuroCents {
  return centsFromDecimal(new Decimal(euros));
}

export type YearMonth = { year: number; month: number };

export function previousMonth(from: Date = new Date()): YearMonth {
  const d = new Date(from);
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function yearMonthKey(ym: YearMonth): string {
  return `${ym.year}-${String(ym.month).padStart(2, '0')}`;
}

export type GermanState =
  | 'BB' | 'BE' | 'BW' | 'BY' | 'HB' | 'HE' | 'HH'
  | 'MV' | 'NI' | 'NW' | 'RP' | 'SH' | 'SL' | 'SN' | 'ST' | 'TH';

export type Steuerklasse = 1 | 2 | 3 | 4 | 5 | 6;

export type KirchensteuerMerkmal = 'ev' | 'rk' | 'ak' | null;
