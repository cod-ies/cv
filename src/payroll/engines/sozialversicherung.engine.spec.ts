import { berechneSVBeitraege, SVInput } from './sozialversicherung.engine';
import { SV_2025 } from '../tables/2025-sv-beitragssatz';

describe('SozialversicherungEngine 2025', () => {
  function input(overrides: Partial<SVInput> = {}): SVInput {
    return {
      bruttoMonatCents: 300_000n, // 3.000 €
      saetze: SV_2025,
      isOst: false,
      kinderlos: false,
      privatKrankenversichert: false,
      ...overrides,
    };
  }

  it('returns positive contributions for standard employee', () => {
    const sv = berechneSVBeitraege(input());
    expect(sv.kvAnCents).toBeGreaterThan(0n);
    expect(sv.pvAnCents).toBeGreaterThan(0n);
    expect(sv.rvAnCents).toBeGreaterThan(0n);
    expect(sv.avAnCents).toBeGreaterThan(0n);
  });

  it('AN and AG shares are equal for KV and RV (symmetric)', () => {
    const sv = berechneSVBeitraege(input());
    expect(sv.kvAnCents).toBe(sv.kvAgCents);
    expect(sv.rvAnCents).toBe(sv.rvAgCents);
    expect(sv.avAnCents).toBe(sv.avAgCents);
  });

  it('kinderlos adds Pflegeversicherungs-Zuschlag to AN only', () => {
    const withKind = berechneSVBeitraege(input({ kinderlos: false }));
    const ohneKind = berechneSVBeitraege(input({ kinderlos: true }));
    expect(ohneKind.pvAnCents).toBeGreaterThan(withKind.pvAnCents);
    // AG share is the same regardless
    expect(ohneKind.pvAgCents).toBe(withKind.pvAgCents);
  });

  it('KV and PV are 0 for private insured employee', () => {
    const sv = berechneSVBeitraege(input({ privatKrankenversichert: true }));
    expect(sv.kvAnCents).toBe(0n);
    expect(sv.kvAgCents).toBe(0n);
    expect(sv.pvAnCents).toBe(0n);
    expect(sv.pvAgCents).toBe(0n);
  });

  it('caps contributions at BBG KV/PV', () => {
    // Brutto far above BBG (10.000 €)
    const high = berechneSVBeitraege(input({ bruttoMonatCents: 1_000_000n }));
    const atBbg = berechneSVBeitraege(input({ bruttoMonatCents: SV_2025.bbgKvPvCentsMonat }));
    // Contributions should be the same at and above BBG
    expect(high.kvAnCents).toBe(atBbg.kvAnCents);
    expect(high.pvAnCents).toBe(atBbg.pvAnCents);
  });

  it('caps RV/AV at BBG RV/AV', () => {
    const high = berechneSVBeitraege(input({ bruttoMonatCents: 1_000_000n }));
    const atBbg = berechneSVBeitraege(input({ bruttoMonatCents: SV_2025.bbgRvAvWestCentsMonat }));
    expect(high.rvAnCents).toBe(atBbg.rvAnCents);
    expect(high.avAnCents).toBe(atBbg.avAnCents);
  });
});
