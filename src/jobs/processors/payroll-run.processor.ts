import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bull';
import { PrismaService } from '../../database/prisma.service';
import { PayrollService } from '../../payroll/payroll.service';
import { YearMonth } from '../../common/types/money';

@Processor('payroll')
export class PayrollRunProcessor {
  private readonly logger = new Logger(PayrollRunProcessor.name);

  constructor(
    private readonly payrollService: PayrollService,
    private readonly prisma: PrismaService,
    @InjectQueue('payslip') private readonly payslipQueue: Queue,
    @InjectQueue('datev') private readonly datevQueue: Queue,
  ) {}

  @Process('run')
  async handleRun(job: Job<{ period: YearMonth }>): Promise<void> {
    const { period } = job.data;
    this.logger.log(`Starting payroll run for ${period.year}-${period.month}`);

    const payrollRunId = await this.payrollService.initiateRun(period);

    const employees = await this.prisma.employee.findMany({
      where: { active: true },
      select: { id: true },
    });

    const errors: string[] = [];

    for (const emp of employees) {
      try {
        await this.payrollService.runForEmployee(emp.id, period, payrollRunId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${emp.id}: ${msg}`);
        this.logger.error(`Payroll failed for employee ${emp.id}`, err);
      }
    }

    if (errors.length > 0) {
      await this.payrollService.failRun(payrollRunId, errors.join('; '));
      return;
    }

    await this.payrollService.completeRun(payrollRunId);

    // Queue downstream jobs
    await this.payslipQueue.addBulk(
      employees.map((e) => ({
        name: 'generate',
        data: { payrollRunId, employeeId: e.id },
        opts: { attempts: 3 },
      })),
    );

    await this.datevQueue.add(
      'export',
      { payrollRunId },
      { jobId: `datev-${payrollRunId}`, attempts: 3 },
    );

    this.logger.log(`Payroll run ${payrollRunId} complete`);
  }
}
