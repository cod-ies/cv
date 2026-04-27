import Decimal from 'decimal.js';
import { EuroCents } from '../../common/types/money';
import { SVSaetze } from '../tables/2025-sv-beitragssatz';

export interface SVInput {
  bruttoMonatCents: EuroCents;
  saetze: SVSaetze;
  /** Is the employee in the eastern states (for BBG)? */
  isOst: boolean;
  /** Is the employee childless and >= 23? (PV Kinderlosenzuschlag) */
  kinderlos: boolean;
  /** Is privately health-insured? (no KV/PV statutory contribution) */
  privatKrankenversichert: boolean;
}

export interface SVBeitraege {
  kvAnCents: EuroCents;
  pvAnCents: EuroCents;
  rvAnCents: EuroCents;
  avAnCents: EuroCents;
  kvAgCents: EuroCents;
  pvAgCents: EuroCents;
  rvAgCents: EuroCents;
  avAgCents: EuroCents;
}

export function berechneSVBeitraege(input: SVInput): SVBeitraege {
  const { bruttoMonatCents, saetze, isOst, kinderlos, privatKrankenversichert } = input;

  const brutto = new Decimal(bruttoMonatCents.toString());

  // Beitragsbemessungsgrundlage KV/PV (monatlich)
  const bbgKvPv = new Decimal(saetze.bbgKvPvCentsMonat.toString());
  const bbgRvAv = new Decimal(
    (isOst
      ? saetze.bbgRvAvOstCentsMonat
      : saetze.bbgRvAvWestCentsMonat
    ).toString(),
  );

  const basisKvPv = Decimal.min(brutto, bbgKvPv);
  const basisRvAv = Decimal.min(brutto, bbgRvAv);

  const round = (d: Decimal) =>
    BigInt(d.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(0));

  // KV
  let kvAn = 0n;
  let kvAg = 0n;
  if (!privatKrankenversichert) {
    kvAn = round(basisKvPv.times(saetze.kvAnteilAN));
    kvAg = round(basisKvPv.times(saetze.kvAnteilAG));
  }

  // PV
  let pvAn = 0n;
  let pvAg = 0n;
  if (!privatKrankenversichert) {
    const pvAnSatz = kinderlos
      ? saetze.pvAnteilAN.plus(saetze.pvKinderlosZuschlagAN)
      : saetze.pvAnteilAN;
    pvAn = round(basisKvPv.times(pvAnSatz));
    pvAg = round(basisKvPv.times(saetze.pvAnteilAG));
  }

  // RV
  const rvAn = round(basisRvAv.times(saetze.rvAnteilAN));
  const rvAg = round(basisRvAv.times(saetze.rvAnteilAG));

  // AV
  const avAn = round(basisRvAv.times(saetze.avAnteilAN));
  const avAg = round(basisRvAv.times(saetze.avAnteilAG));

  return {
    kvAnCents: kvAn,
    pvAnCents: pvAn,
    rvAnCents: rvAn,
    avAnCents: avAn,
    kvAgCents: kvAg,
    pvAgCents: pvAg,
    rvAgCents: rvAg,
    avAgCents: avAg,
  };
}
