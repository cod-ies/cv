import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { CronScheduler } from './schedulers/cron.scheduler';
import { ShiftpilotSyncProcessor } from './processors/shiftpilot-sync.processor';
import { ElstamSyncProcessor } from './processors/elstam-sync.processor';
import { PayrollRunProcessor } from './processors/payroll-run.processor';
import { PayslipGenerateProcessor } from './processors/payslip-generate.processor';
import { DatevExportProcessor } from './processors/datev-export.processor';
import { ElsterSubmitProcessor } from './processors/elster-submit.processor';

import { ShiftpilotModule } from '../shiftpilot/shiftpilot.module';
import { ElstamModule } from '../elstam/elstam.module';
import { PayrollModule } from '../payroll/payroll.module';
import { PayslipModule } from '../payslip/payslip.module';
import { DatevModule } from '../datev/datev.module';
import { ElsterSubmissionModule } from '../elster-submission/elster-submission.module';

const QUEUES = [
  'shiftpilot',
  'elstam',
  'payroll',
  'payslip',
  'datev',
  'elster',
];

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ...QUEUES.map((name) =>
      BullModule.registerQueueAsync({
        name,
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          redis: {
            host: config.get<string>('redis.host'),
            port: config.get<number>('redis.port'),
          },
        }),
        inject: [ConfigService],
      }),
    ),
    ShiftpilotModule,
    ElstamModule,
    PayrollModule,
    PayslipModule,
    DatevModule,
    ElsterSubmissionModule,
  ],
  providers: [
    CronScheduler,
    ShiftpilotSyncProcessor,
    ElstamSyncProcessor,
    PayrollRunProcessor,
    PayslipGenerateProcessor,
    DatevExportProcessor,
    ElsterSubmitProcessor,
  ],
})
export class JobsModule {}
