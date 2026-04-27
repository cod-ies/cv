/** Raw ShiftPilot API employee object */
export interface ShiftpilotEmployeeDto {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;       // ISO date
  taxId: string;             // Steueridentifikationsnummer
  federalState: string;      // e.g. "NW", "BY"
  hourlyRateEuros: number;
  employmentStartDate: string; // ISO date
  employmentEndDate?: string;
  active: boolean;
}
