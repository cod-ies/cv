import { Module } from '@nestjs/common';
import { PayrollRunsController } from './v1/payroll-runs/payroll-runs.controller';
import { ExportsController } from './v1/exports/exports.controller';
import { PayrollModule } from '../payroll/payroll.module';
import { DatevModule } from '../datev/datev.module';
import { ElsterSubmissionModule } from '../elster-submission/elster-submission.module';

@Module({
  imports: [PayrollModule, DatevModule, ElsterSubmissionModule],
  controllers: [PayrollRunsController, ExportsController],
})
export class ApiModule {}
