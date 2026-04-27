import { Module } from '@nestjs/common';
import { DatevService } from './datev.service';

@Module({
  providers: [DatevService],
  exports: [DatevService],
})
export class DatevModule {}
