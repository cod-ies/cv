import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { ShiftpilotEmployeeDto } from './dto/employee.dto';
import { ShiftpilotShiftDto } from './dto/shift.dto';

@Injectable()
export class ShiftpilotMapper {
  toEmployeeUpsert(
    dto: ShiftpilotEmployeeDto,
  ): Prisma.EmployeeUpsertArgs {
    return {
      where: { shiftpilotId: dto.id },
      create: {
        shiftpilotId: dto.id,
        steuerId: dto.taxId,
        vorname: dto.firstName,
        nachname: dto.lastName,
        geburtsdatum: dto.dateOfBirth,
        bundesland: `DE-${dto.federalState}`,
        hourlyRateCents: BigInt(
          new Decimal(dto.hourlyRateEuros).times(100).toFixed(0),
        ),
        active: dto.active,
      },
      update: {
        steuerId: dto.taxId,
        vorname: dto.firstName,
        nachname: dto.lastName,
        geburtsdatum: dto.dateOfBirth,
        bundesland: `DE-${dto.federalState}`,
        hourlyRateCents: BigInt(
          new Decimal(dto.hourlyRateEuros).times(100).toFixed(0),
        ),
        active: dto.active,
      },
    };
  }

  toShiftCreate(
    dto: ShiftpilotShiftDto,
    employeeInternalId: string,
    fallbackHourlyRateCents: bigint,
  ): Prisma.ShiftCreateInput {
    const rateCents =
      dto.hourlyRateEuros !== undefined
        ? BigInt(new Decimal(dto.hourlyRateEuros).times(100).toFixed(0))
        : fallbackHourlyRateCents;

    return {
      shiftpilotId: dto.id,
      employee: { connect: { id: employeeInternalId } },
      startedAt: new Date(dto.startTime),
      endedAt: new Date(dto.endTime),
      breakMinutes: dto.breakMinutes,
      hourlyRateCents: rateCents,
      rawPayload: dto as unknown as Prisma.InputJsonValue,
    };
  }
}
