import { GrossPayEngine, ShiftHours } from './gross-pay.engine';

describe('GrossPayEngine', () => {
  let engine: GrossPayEngine;

  beforeEach(() => {
    engine = new GrossPayEngine();
  });

  it('calculates pay for a full 8-hour shift with 30 min break', () => {
    const shifts: ShiftHours[] = [
      {
        startedAt: new Date('2025-01-06T08:00:00Z'),
        endedAt: new Date('2025-01-06T16:30:00Z'),
        breakMinutes: 30,
        hourlyRateCents: 1500n, // 15.00 €/h
      },
    ];
    // 8.5h total - 0.5h break = 8h × 1500ct = 12000 ct
    expect(engine.calculate(shifts)).toBe(12_000n);
  });

  it('returns 0 for shift with break >= duration', () => {
    const shifts: ShiftHours[] = [
      {
        startedAt: new Date('2025-01-06T08:00:00Z'),
        endedAt: new Date('2025-01-06T08:30:00Z'),
        breakMinutes: 60,
        hourlyRateCents: 1500n,
      },
    ];
    expect(engine.calculate(shifts)).toBe(0n);
  });

  it('accumulates multiple shifts', () => {
    const hourlyRate = 2000n; // 20 €/h
    const shifts: ShiftHours[] = [
      {
        startedAt: new Date('2025-01-06T08:00:00Z'),
        endedAt: new Date('2025-01-06T12:00:00Z'),
        breakMinutes: 0,
        hourlyRateCents: hourlyRate,
      },
      {
        startedAt: new Date('2025-01-07T08:00:00Z'),
        endedAt: new Date('2025-01-07T12:00:00Z'),
        breakMinutes: 0,
        hourlyRateCents: hourlyRate,
      },
    ];
    // 4h + 4h = 8h × 2000 = 16_000 ct
    expect(engine.calculate(shifts)).toBe(16_000n);
  });

  it('rounds half-up correctly', () => {
    // 1h 1min × 1000ct = 1000 + 16.67ct → 1017ct
    const shifts: ShiftHours[] = [
      {
        startedAt: new Date('2025-01-06T08:00:00Z'),
        endedAt: new Date('2025-01-06T09:01:00Z'),
        breakMinutes: 0,
        hourlyRateCents: 1000n,
      },
    ];
    const result = engine.calculate(shifts);
    expect(result).toBe(1017n);
  });

  it('returns 0 for empty shift list', () => {
    expect(engine.calculate([])).toBe(0n);
  });
});
