import { Module } from '@nestjs/common';
import { ShiftpilotClient } from './shiftpilot.client';
import { ShiftpilotMapper } from './shiftpilot.mapper';
import { ShiftpilotSyncService } from './shiftpilot.sync.service';

@Module({
  providers: [ShiftpilotClient, ShiftpilotMapper, ShiftpilotSyncService],
  exports: [ShiftpilotSyncService],
})
export class ShiftpilotModule {}
