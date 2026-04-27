import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { ElstamService } from '../../elstam/elstam.service';
import { YearMonth } from '../../common/types/money';

@Processor('elstam')
export class ElstamSyncProcessor {
  private readonly logger = new Logger(ElstamSyncProcessor.name);

  constructor(
    private readonly elstam: ElstamService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('sync')
  async handleSync(job: Job<{ period: YearMonth }>): Promise<void> {
    this.logger.log(`Processing ELStAM sync job ${job.id}`);
    const { period } = job.data;

    const employees = await this.prisma.employee.findMany({
      where: { active: true },
      select: { id: true, steuerId: true },
    });

    for (const emp of employees) {
      try {
        await this.elstam.fetchTaxFeatures(
          emp.id,
          emp.steuerId,
          period.year,
          period.month,
        );
      } catch (err) {
        this.logger.error(
          `ELStAM sync failed for employee ${emp.id}`,
          err,
        );
      }
    }

    this.logger.log(`ELStAM sync complete: ${employees.length} employees`);
  }
}
