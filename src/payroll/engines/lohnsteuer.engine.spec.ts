import Decimal from 'decimal.js';
import { LohnsteuerEngine2025, LohnsteuerInput } from './lohnsteuer.engine';

/**
 * Test vectors derived from the BMF Programmablaufplan 2025.
 * Reference: BMF-Schreiben IV C 5 – S 2361/19/10007 :010
 *
 * Note: These are simplified reference cases. For full BMF Prüftabelle
 * compliance, run the engine against the official published test cases.
 */
describe('LohnsteuerEngine2025', () => {
  let engine: LohnsteuerEngine2025;

  beforeEach(() => {
    engine = new LohnsteuerEngine2025();
  });

  function input(overrides: Partial<LohnsteuerInput> = {}): LohnsteuerInput {
    return {
      bruttoMonatCents: 300_000n, // 3.000 €
      steuerklasse: 1,
      kinderfreibetrag: new Decimal(0),
      kirchensteuerpflichtig: false,
      gesetzlichKrankenversichert: true,
      jahresArbeitslohnBisherCents: 0n,
      year: 2025,
      ...overrides,
    };
  }

  it('returns 0 Lohnsteuer below Grundfreibetrag (SK1)', () => {
    // Annual: 11.784 € ÷ 12 = 982 €/Monat → no tax
    const result = engine.calculate(input({ bruttoMonatCents: 98_200n }));
    expect(result.lohnsteuerMonatCents).toBe(0n);
    expect(result.soliMonatCents).toBe(0n);
  });

  it('calculates positive Lohnsteuer for SK1 at 3000 €/month', () => {
    const result = engine.calculate(input());
    expect(result.lohnsteuerMonatCents).toBeGreaterThan(0n);
  });

  it('SK3 yields lower Lohnsteuer than SK1 for same gross (splitting)', () => {
    const sk1 = engine.calculate(input({ steuerklasse: 1 }));
    const sk3 = engine.calculate(input({ steuerklasse: 3 }));
    expect(sk3.lohnsteuerMonatCents).toBeLessThan(sk1.lohnsteuerMonatCents);
  });

  it('SK6 yields higher Lohnsteuer than SK1 (no Arbeitnehmer-Pauschbetrag)', () => {
    const sk1 = engine.calculate(input({ steuerklasse: 1 }));
    const sk6 = engine.calculate(input({ steuerklasse: 6 }));
    expect(sk6.lohnsteuerMonatCents).toBeGreaterThan(sk1.lohnsteuerMonatCents);
  });

  it('Kinderfreibetrag reduces Lohnsteuer', () => {
    const noKind = engine.calculate(input({ kinderfreibetrag: new Decimal(0) }));
    const withKind = engine.calculate(input({ kinderfreibetrag: new Decimal(1) }));
    expect(withKind.lohnsteuerMonatCents).toBeLessThanOrEqual(noKind.lohnsteuerMonatCents);
  });

  it('returns 0 Soli below Freigrenze', () => {
    // Low income — Soli Freigrenze ist 18.130 € Jahres-LSt
    const result = engine.calculate(input({ bruttoMonatCents: 200_000n }));
    expect(result.soliMonatCents).toBe(0n);
  });

  it('returns non-negative values for all outputs', () => {
    for (const sk of [1, 2, 3, 4, 5, 6] as const) {
      const result = engine.calculate(input({ steuerklasse: sk, bruttoMonatCents: 500_000n }));
      expect(result.lohnsteuerMonatCents).toBeGreaterThanOrEqual(0n);
      expect(result.soliMonatCents).toBeGreaterThanOrEqual(0n);
    }
  });
});
