import { DatevRecord } from './datev.mapper';

/**
 * DATEV LODAS ASCII format writer.
 * Line format: PERSONAL_NR(10) | LOHNART(4) | BETRAG(12, right-justified, in Cent)
 * Encoded in Windows-1252 (Latin-1 superset) — DATEV's required encoding.
 */
export function writeDatevFile(
  records: DatevRecord[],
  periodYear: number,
  periodMonth: number,
): Buffer {
  const header =
    `DATEV LODAS EXPORT ${periodYear}-${String(periodMonth).padStart(2, '0')}\r\n`;

  const lines = records.map((r) => {
    const pnr = r.personalNr.padEnd(10, ' ').substring(0, 10);
    const lohnart = r.lohnart.padEnd(4, ' ').substring(0, 4);
    const betrag = r.betragCents.toString().padStart(12, ' ');
    return `${pnr}${lohnart}${betrag}\r\n`;
  });

  const content = header + lines.join('');

  // Windows-1252 encoding — for ASCII-compatible content this equals latin1
  return Buffer.from(content, 'latin1');
}
