import { Module } from '@nestjs/common';
import { EricService } from './eric.service';

@Module({
  providers: [EricService],
  exports: [EricService],
})
export class EricModule {}
