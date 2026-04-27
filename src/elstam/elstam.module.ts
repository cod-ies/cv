import { Module } from '@nestjs/common';
import { ElstamHttpClient } from './elstam.http-client';
import { ElstamService } from './elstam.service';
import { ElstamXmlBuilder } from './elstam.xml-builder';
import { ElstamXmlParser } from './elstam.xml-parser';

@Module({
  providers: [
    ElstamHttpClient,
    ElstamService,
    ElstamXmlBuilder,
    ElstamXmlParser,
  ],
  exports: [ElstamService],
})
export class ElstamModule {}
