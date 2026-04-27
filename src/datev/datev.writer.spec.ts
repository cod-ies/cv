import { writeDatevFile } from './datev.writer';
import { DatevRecord } from './datev.mapper';

describe('DatevWriter', () => {
  const records: DatevRecord[] = [
    { personalNr: 'EMP001    ', lohnart: 'LOHN', betragCents: 300_000n },
    { personalNr: 'EMP001    ', lohnart: 'LSTE', betragCents: 45_000n },
    { personalNr: 'EMP001    ', lohnart: 'NETT', betragCents: 210_000n },
  ];

  it('produces a Buffer', () => {
    const buf = writeDatevFile(records, 2025, 1);
    expect(buf).toBeInstanceOf(Buffer);
  });

  it('starts with DATEV header line', () => {
    const buf = writeDatevFile(records, 2025, 1);
    const text = buf.toString('latin1');
    expect(text.startsWith('DATEV LODAS EXPORT 2025-01')).toBe(true);
  });

  it('produces correct number of lines (header + records)', () => {
    const buf = writeDatevFile(records, 2025, 3);
    const lines = buf.toString('latin1').split('\r\n').filter(Boolean);
    expect(lines.length).toBe(1 + records.length); // header + 3 data rows
  });

  it('right-justifies amounts in 12-char field', () => {
    const buf = writeDatevFile([records[0]], 2025, 1);
    const dataLine = buf.toString('latin1').split('\r\n')[1];
    // personalNr(10) + lohnart(4) + amount(12)
    expect(dataLine.length).toBe(26);
    expect(dataLine.substring(14).trim()).toBe('300000');
  });

  it('pads month correctly (01 for January)', () => {
    const buf = writeDatevFile([], 2025, 1);
    expect(buf.toString('latin1')).toContain('2025-01');
  });
});
