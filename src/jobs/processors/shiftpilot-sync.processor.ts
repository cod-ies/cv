import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ShiftpilotSyncService } from '../../shiftpilot/shiftpilot.sync.service';
import { YearMonth } from '../../common/types/money';

@Processor('shiftpilot')
export class ShiftpilotSyncProcessor {
  private readonly logger = new Logger(ShiftpilotSyncProcessor.name);

  constructor(private readonly syncService: ShiftpilotSyncService) {}

  @Process('sync')
  async handleSync(job: Job<{ period: YearMonth }>): Promise<void> {
    this.logger.log(`Processing ShiftPilot sync job ${job.id}`);
    await this.syncService.syncEmployees();
    await this.syncService.syncShifts(job.data.period);
    this.logger.log(`ShiftPilot sync job ${job.id} complete`);
  }
}
