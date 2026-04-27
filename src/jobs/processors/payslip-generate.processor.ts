import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { PayslipService } from '../../payslip/payslip.service';

@Processor('payslip')
export class PayslipGenerateProcessor {
  private readonly logger = new Logger(PayslipGenerateProcessor.name);

  constructor(
    private readonly payslipService: PayslipService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('generate')
  async handleGenerate(
    job: Job<{ payrollRunId: string; employeeId: string }>,
  ): Promise<void> {
    const { payrollRunId, employeeId } = job.data;

    const entry = await this.prisma.payrollEntry.findUnique({
      where: { payrollRunId_employeeId: { payrollRunId, employeeId } },
    });

    if (!entry) {
      this.logger.warn(`No payroll entry for run=${payrollRunId} emp=${employeeId}`);
      return;
    }

    await this.payslipService.generateForEntry(entry.id);
    this.logger.log(`Payslip generated for entry ${entry.id}`);
  }
}
