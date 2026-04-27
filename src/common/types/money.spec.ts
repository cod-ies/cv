import Decimal from 'decimal.js';
import {
  centsFromDecimal,
  decimalFromCents,
  centsFromEuros,
  previousMonth,
  yearMonthKey,
} from './money';

describe('money utils', () => {
  describe('centsFromDecimal', () => {
    it('converts 15.50 to 1550n', () => {
      expect(centsFromDecimal(new Decimal('15.50'))).toBe(1550n);
    });

    it('rounds half-up at 0.005', () => {
      expect(centsFromDecimal(new Decimal('1.005'))).toBe(101n);
    });
  });

  describe('decimalFromCents', () => {
    it('converts 1550n to 15.50', () => {
      expect(decimalFromCents(1550n).toFixed(2)).toBe('15.50');
    });
  });

  describe('centsFromEuros', () => {
    it('converts string 18.00 correctly', () => {
      expect(centsFromEuros('18.00')).toBe(1800n);
    });
  });

  describe('previousMonth', () => {
    it('returns previous month', () => {
      const result = previousMonth(new Date('2025-03-15'));
      expect(result).toEqual({ year: 2025, month: 2 });
    });

    it('wraps year correctly for January', () => {
      const result = previousMonth(new Date('2025-01-10'));
      expect(result).toEqual({ year: 2024, month: 12 });
    });
  });

  describe('yearMonthKey', () => {
    it('pads month with zero', () => {
      expect(yearMonthKey({ year: 2025, month: 3 })).toBe('2025-03');
    });

    it('does not pad 2-digit months', () => {
      expect(yearMonthKey({ year: 2025, month: 11 })).toBe('2025-11');
    });
  });
});
