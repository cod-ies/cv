import { ShiftpilotMapper } from './shiftpilot.mapper';
import { ShiftpilotEmployeeDto } from './dto/employee.dto';
import { ShiftpilotShiftDto } from './dto/shift.dto';

describe('ShiftpilotMapper', () => {
  let mapper: ShiftpilotMapper;

  beforeEach(() => {
    mapper = new ShiftpilotMapper();
  });

  describe('toEmployeeUpsert', () => {
    const dto: ShiftpilotEmployeeDto = {
      id: 'sp-emp-001',
      firstName: 'Max',
      lastName: 'Mustermann',
      dateOfBirth: '1985-06-15',
      taxId: '12345678901',
      federalState: 'NW',
      hourlyRateEuros: 15.5,
      employmentStartDate: '2024-01-01',
      active: true,
    };

    it('maps shiftpilot ID correctly', () => {
      const args = mapper.toEmployeeUpsert(dto);
      expect(args.where.shiftpilotId).toBe('sp-emp-001');
      expect(args.create.shiftpilotId).toBe('sp-emp-001');
    });

    it('converts hourly rate to cents correctly', () => {
      const args = mapper.toEmployeeUpsert(dto);
      expect(args.create.hourlyRateCents).toBe(1550n); // 15.50 € = 1550 ct
    });

    it('prefixes bundesland with DE-', () => {
      const args = mapper.toEmployeeUpsert(dto);
      expect(args.create.bundesland).toBe('DE-NW');
    });

    it('maps all name fields', () => {
      const args = mapper.toEmployeeUpsert(dto);
      expect(args.create.vorname).toBe('Max');
      expect(args.create.nachname).toBe('Mustermann');
    });
  });

  describe('toShiftCreate', () => {
    const dto: ShiftpilotShiftDto = {
      id: 'sp-shift-001',
      employeeId: 'sp-emp-001',
      startTime: '2025-01-06T08:00:00Z',
      endTime: '2025-01-06T16:30:00Z',
      breakMinutes: 30,
    };

    it('uses fallback hourly rate when not set in shift', () => {
      const input = mapper.toShiftCreate(dto, 'internal-emp-id', 2000n);
      expect(input.hourlyRateCents).toBe(2000n);
    });

    it('uses shift-level rate override when present', () => {
      const dtoWithRate = { ...dto, hourlyRateEuros: 18.0 };
      const input = mapper.toShiftCreate(dtoWithRate, 'internal-emp-id', 1500n);
      expect(input.hourlyRateCents).toBe(1800n);
    });

    it('sets correct breakMinutes', () => {
      const input = mapper.toShiftCreate(dto, 'internal-emp-id', 1500n);
      expect(input.breakMinutes).toBe(30);
    });

    it('parses startedAt and endedAt as Date objects', () => {
      const input = mapper.toShiftCreate(dto, 'internal-emp-id', 1500n);
      expect(input.startedAt).toBeInstanceOf(Date);
      expect(input.endedAt).toBeInstanceOf(Date);
    });
  });
});
