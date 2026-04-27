import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ElsterSubmissionService } from '../../elster-submission/elster-submission.service';
import { YearMonth } from '../../common/types/money';

@Processor('elster')
export class ElsterSubmitProcessor {
  private readonly logger = new Logger(ElsterSubmitProcessor.name);

  constructor(private readonly submissionService: ElsterSubmissionService) {}

  @Process('submit')
  async handleSubmit(job: Job<{ period: YearMonth }>): Promise<void> {
    this.logger.log(`Processing ELSTER submission job ${job.id}`);
    await this.submissionService.submitForPeriod(job.data.period);
    this.logger.log(`ELSTER submission job ${job.id} complete`);
  }
}
