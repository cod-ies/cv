/** Raw ShiftPilot API shift object */
export interface ShiftpilotShiftDto {
  id: string;
  employeeId: string;
  startTime: string;   // ISO datetime
  endTime: string;     // ISO datetime
  breakMinutes: number;
  hourlyRateEuros?: number; // override, falls back to employee rate
}
