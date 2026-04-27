import { PayrollEntry, Employee } from '@prisma/client';

/** DATEV LODAS field descriptor for fixed-width encoding */
export interface DatevRecord {
  personalNr: string;       // max 10 chars
  lohnart: string;          // max 4 chars (Lohnart code)
  betragCents: bigint;
}

/** Maps payroll entries to simplified DATEV LODAS records */
export function mapToDATEV(
  entries: Array<PayrollEntry & { employee: Employee }>,
): DatevRecord[] {
  const records: DatevRecord[] = [];

  for (const entry of entries) {
    const pnr = entry.employee.shiftpilotId.substring(0, 10).padEnd(10, ' ');

    records.push({ personalNr: pnr, lohnart: 'LOHN', betragCents: entry.bruttoEntgeltCents });
    records.push({ personalNr: pnr, lohnart: 'LSTE', betragCents: entry.lohnsteuerCents });
    records.push({ personalNr: pnr, lohnart: 'SOLI', betragCents: entry.soliCents });
    records.push({ personalNr: pnr, lohnart: 'KIST', betragCents: entry.kirchensteuerCents });
    records.push({ personalNr: pnr, lohnart: 'KVAN', betragCents: entry.kvAnCents });
    records.push({ personalNr: pnr, lohnart: 'PVAN', betragCents: entry.pvAnCents });
    records.push({ personalNr: pnr, lohnart: 'RVAN', betragCents: entry.rvAnCents });
    records.push({ personalNr: pnr, lohnart: 'AVAN', betragCents: entry.avAnCents });
    records.push({ personalNr: pnr, lohnart: 'NETT', betragCents: entry.nettoEntgeltCents });
  }

  return records;
}
