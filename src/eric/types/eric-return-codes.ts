export const ERIC_OK = 0;

export const ERIC_RETURN_CODES: Record<number, string> = {
  0:         'ERIC_OK',
  610001001: 'ERIC_GLOBAL_UNKNOWN',
  610001003: 'ERIC_GLOBAL_INIT_FEHLER',
  610001034: 'ERIC_GLOBAL_ZERTIFIKAT_FEHLER',
  610001064: 'ERIC_GLOBAL_KEINE_DATEN_VORHANDEN',
  618001001: 'ERIC_SEND_INIT_FEHLER',
  618001002: 'ERIC_SEND_SICHERHEITSCODE_FALSCH',
  618001017: 'ERIC_SEND_ÜBERTRAGUNG_ABGEBROCHEN',
  618001030: 'ERIC_SEND_SERVER_SICHERHEITSCODE_FALSCH',
};

export function ericCodeToString(code: number): string {
  return ERIC_RETURN_CODES[code] ?? `UNKNOWN_${code}`;
}

export class EricError extends Error {
  constructor(
    public readonly returnCode: number,
    context?: string,
  ) {
    super(
      `ERiC error ${returnCode} (${ericCodeToString(returnCode)})${context ? `: ${context}` : ''}`,
    );
    this.name = 'EricError';
  }
}
