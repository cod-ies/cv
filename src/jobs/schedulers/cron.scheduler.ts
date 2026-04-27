import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { previousMonth, yearMonthKey } from '../../common/types/money';

@Injectable()
export class CronScheduler {
  private readonly logger = new Logger(CronScheduler.name);

  constructor(
    @InjectQueue('shiftpilot') private readonly shiftpilotQueue: Queue,
    @InjectQueue('elstam') private readonly elstamQueue: Queue,
    @InjectQueue('payroll') private readonly payrollQueue: Queue,
    @InjectQueue('elster') private readonly elsterQueue: Queue,
  ) {}

  /** Daily 02:00 — sync employees and previous-month shifts from ShiftPilot */
  @Cron('0 2 * * *')
  async triggerShiftpilotSync(): Promise<void> {
    const period = previousMonth();
    const jobId = `sp-sync-${yearMonthKey(period)}`;
    await this.shiftpilotQueue.add('sync', { period }, { jobId, attempts: 3 });
    this.logger.log(`Queued ShiftPilot sync job ${jobId}`);
  }

  /** Daily 03:00 — refresh ELStAM data for all active employees */
  @Cron('0 3 * * *')
  async triggerElstamSync(): Promise<void> {
    const period = previousMonth();
    const jobId = `elstam-sync-${yearMonthKey(period)}`;
    await this.elstamQueue.add('sync', { period }, { jobId, attempts: 3 });
    this.logger.log(`Queued ELStAM sync job ${jobId}`);
  }

  /** 1st of each month 06:00 — run payroll for previous month */
  @Cron('0 6 1 * *')
  async triggerPayrollRun(): Promise<void> {
    const period = previousMonth();
    const jobId = `payroll-run-${yearMonthKey(period)}`;
    await this.payrollQueue.add('run', { period }, { jobId, attempts: 2 });
    this.logger.log(`Queued payroll run job ${jobId}`);
  }

  /**
   * 8th of each month 08:00 — ELSTER Lohnsteuer-Anmeldung
   * Deadline is the 10th; this gives 2 days buffer for failures.
   */
  @Cron('0 8 8 * *')
  async triggerElsterSubmission(): Promise<void> {
    const period = previousMonth();
    const jobId = `elster-submit-${yearMonthKey(period)}`;
    await this.elsterQueue.add('submit', { period }, { jobId, attempts: 3 });
    this.logger.log(`Queued ELSTER submission job ${jobId}`);
  }
}
