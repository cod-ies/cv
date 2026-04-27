import Decimal from 'decimal.js';

/**
 * Sozialversicherungs-Beitragssätze 2025 (§ 241 ff. SGB V, § 158 SGB VI, § 55 SGB XI, § 341 SGB III)
 *
 * West/Ost BBG:
 * - KV/PV: bundeseinheitlich
 * - RV/AV West: 7.550 €/Monat = 90.600 €/Jahr
 * - RV/AV Ost: 7.450 €/Monat = 89.400 €/Jahr (angeglichen 2025)
 *
 * Source: GKV-Spitzenverband / Deutsche Rentenversicherung Pressemitteilungen
 * Update this file each January when new values are published.
 */
export interface SVSaetze {
  year: number;

  // KV: gesetzlich (AN + AG je 7.3 % + Zusatzbeitrag GKV-Durchschnitt 2025: 1.7 %)
  kvAnteilAN: Decimal;   // 7.3 + 0.85 (halber Zusatz)
  kvAnteilAG: Decimal;   // 7.3 + 0.85

  // PV: (AN + AG je 1.7 %; Kinderlosenzuschlag 0.6 % für AN ohne Kind ab 23)
  pvAnteilAN: Decimal;
  pvAnteilAG: Decimal;
  pvKinderlosZuschlagAN: Decimal; // zusätzlich für Kinderlose

  // RV
  rvAnteilAN: Decimal;   // 9.3 %
  rvAnteilAG: Decimal;   // 9.3 %

  // AV
  avAnteilAN: Decimal;   // 1.3 %
  avAnteilAG: Decimal;   // 1.3 %

  // BBG (monatlich, in Cent)
  bbgKvPvCentsMonat: bigint;   // KV/PV: 5.512,50 € = 551_250n
  bbgRvAvWestCentsMonat: bigint; // RV/AV West: 7.550 € = 755_000n
  bbgRvAvOstCentsMonat: bigint;  // RV/AV Ost:  7.450 € = 745_000n
}

export const SV_2025: SVSaetze = {
  year: 2025,

  kvAnteilAN: new Decimal('0.0815'),  // 7.3 + 0.85 (half Zusatzbeitrag 1.7%)
  kvAnteilAG: new Decimal('0.0815'),

  pvAnteilAN: new Decimal('0.017'),
  pvAnteilAG: new Decimal('0.017'),
  pvKinderlosZuschlagAN: new Decimal('0.006'),

  rvAnteilAN: new Decimal('0.093'),
  rvAnteilAG: new Decimal('0.093'),

  avAnteilAN: new Decimal('0.013'),
  avAnteilAG: new Decimal('0.013'),

  bbgKvPvCentsMonat: 551_250n,
  bbgRvAvWestCentsMonat: 755_000n,
  bbgRvAvOstCentsMonat: 755_000n,
};
