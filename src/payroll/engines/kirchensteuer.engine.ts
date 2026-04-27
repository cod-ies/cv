import Decimal from 'decimal.js';
import { EuroCents, GermanState } from '../../common/types/money';

/**
 * Kirchensteuersätze 2025 nach Bundesland.
 * BW, BY: 8 % der Lohnsteuer; alle anderen: 9 %.
 */
const KIRCHENSTEUER_SATZ: Record<GermanState, Decimal> = {
  BW: new Decimal('0.08'),
  BY: new Decimal('0.08'),
  BB: new Decimal('0.09'),
  BE: new Decimal('0.09'),
  HB: new Decimal('0.09'),
  HE: new Decimal('0.09'),
  HH: new Decimal('0.09'),
  MV: new Decimal('0.09'),
  NI: new Decimal('0.09'),
  NW: new Decimal('0.09'),
  RP: new Decimal('0.09'),
  SH: new Decimal('0.09'),
  SL: new Decimal('0.09'),
  SN: new Decimal('0.09'),
  ST: new Decimal('0.09'),
  TH: new Decimal('0.09'),
};

export function berechneKirchensteuer(
  lohnsteuerCents: EuroCents,
  bundesland: GermanState,
  kirchensteuerpflichtig: boolean,
): EuroCents {
  if (!kirchensteuerpflichtig) return 0n;

  const satz = KIRCHENSTEUER_SATZ[bundesland] ?? new Decimal('0.09');
  const kst = new Decimal(lohnsteuerCents.toString())
    .times(satz)
    .toDecimalPlaces(0, Decimal.ROUND_DOWN);

  return BigInt(kst.toFixed(0));
}
