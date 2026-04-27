import { Module } from '@nestjs/common';
import { ElsterSubmissionService } from './elster-submission.service';
import { ElsterSubmissionXmlBuilder } from './elster-submission.xml-builder';
import { EricModule } from '../eric/eric.module';

@Module({
  imports: [EricModule],
  providers: [ElsterSubmissionService, ElsterSubmissionXmlBuilder],
  exports: [ElsterSubmissionService],
})
export class ElsterSubmissionModule {}
