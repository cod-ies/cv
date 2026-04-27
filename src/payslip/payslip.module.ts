import { Module } from '@nestjs/common';
import { PayslipService } from './payslip.service';

@Module({
  providers: [PayslipService],
  exports: [PayslipService],
})
export class PayslipModule {}
