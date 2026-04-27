import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ShiftpilotClient } from './shiftpilot.client';
import { ShiftpilotMapper } from './shiftpilot.mapper';
import { YearMonth } from '../common/types/money';

@Injectable()
export class ShiftpilotSyncService {
  private readonly logger = new Logger(ShiftpilotSyncService.name);

  constructor(
    private readonly client: ShiftpilotClient,
    private readonly mapper: ShiftpilotMapper,
    private readonly prisma: PrismaService,
  ) {}

  async syncEmployees(): Promise<void> {
    this.logger.log('Starting employee sync from ShiftPilot');
    const employees = await this.client.getEmployees();

    for (const dto of employees) {
      const args = this.mapper.toEmployeeUpsert(dto);
      await this.prisma.employee.upsert(args);
    }

    this.logger.log(`Synced ${employees.length} employees`);
  }

  async syncShifts(period: YearMonth): Promise<void> {
    this.logger.log(`Starting shift sync for ${period.year}-${period.month}`);
    const shifts = await this.client.getShiftsForMonth(period);

    for (const dto of shifts) {
      const employee = await this.prisma.employee.findFirst({
        where: { shiftpilotId: dto.employeeId },
      });

      if (!employee) {
        this.logger.warn(
          `Shift ${dto.id}: employee ${dto.employeeId} not found in DB, skipping`,
        );
        continue;
      }

      const createInput = this.mapper.toShiftCreate(
        dto,
        employee.id,
        employee.hourlyRateCents,
      );

      await this.prisma.shift.upsert({
        where: { shiftpilotId: dto.id },
        create: createInput,
        update: {
          startedAt: createInput.startedAt,
          endedAt: createInput.endedAt,
          breakMinutes: createInput.breakMinutes,
          hourlyRateCents: createInput.hourlyRateCents,
          rawPayload: createInput.rawPayload,
        },
      });
    }

    this.logger.log(`Synced ${shifts.length} shifts for ${period.year}-${period.month}`);
  }
}
