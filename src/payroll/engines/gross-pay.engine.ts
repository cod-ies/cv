import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { EuroCents } from '../../common/types/money';

export interface ShiftHours {
  startedAt: Date;
  endedAt: Date;
  breakMinutes: number;
  hourlyRateCents: bigint;
}

@Injectable()
export class GrossPayEngine {
  /**
   * Calculate gross pay from a list of shifts.
   * Billable minutes = (endedAt - startedAt) - breakMinutes.
   * Amounts are rounded to whole cents (ROUND_HALF_UP).
   */
  calculate(shifts: ShiftHours[]): EuroCents {
    let totalCents = new Decimal(0);

    for (const shift of shifts) {
      const durationMs = shift.endedAt.getTime() - shift.startedAt.getTime();
      const durationMinutes = new Decimal(durationMs).dividedBy(60_000);
      const billableMinutes = durationMinutes.minus(shift.breakMinutes);

      if (billableMinutes.lte(0)) continue;

      // hours × rate (both as Decimal for precision)
      const hours = billableMinutes.dividedBy(60);
      const rateCents = new Decimal(shift.hourlyRateCents.toString());
      totalCents = totalCents.plus(hours.times(rateCents));
    }

    return BigInt(totalCents.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toString());
  }
}
