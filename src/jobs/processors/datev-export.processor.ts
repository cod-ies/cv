import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DatevService } from '../../datev/datev.service';

@Processor('datev')
export class DatevExportProcessor {
  private readonly logger = new Logger(DatevExportProcessor.name);

  constructor(private readonly datevService: DatevService) {}

  @Process('export')
  async handleExport(job: Job<{ payrollRunId: string }>): Promise<void> {
    this.logger.log(`Processing DATEV export job ${job.id}`);
    const exportId = await this.datevService.exportForRun(job.data.payrollRunId);
    this.logger.log(`DATEV export ${exportId} complete`);
  }
}
