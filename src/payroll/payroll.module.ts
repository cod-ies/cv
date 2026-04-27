import { Module } from '@nestjs/common';
import { GrossPayEngine } from './engines/gross-pay.engine';
import { PayrollService } from './payroll.service';

@Module({
  providers: [GrossPayEngine, PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
