import { Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../../database/prisma.service';
import { DatevService } from '../../../datev/datev.service';
import { ElsterSubmissionService } from '../../../elster-submission/elster-submission.service';
import { FastifyReply } from 'fastify';
import * as fs from 'fs';

@ApiTags('exports')
@Controller('api/v1')
export class ExportsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly datevService: DatevService,
    private readonly elsterService: ElsterSubmissionService,
  ) {}

  @Get('exports/datev/:runId')
  @ApiOperation({ summary: 'Download DATEV export file for a payroll run' })
  async datevExport(
    @Param('runId') runId: string,
    @Res() reply: FastifyReply,
  ) {
    const export_ = await this.prisma.datevExport.findFirstOrThrow({
      where: { payrollRunId: runId },
    });

    const filePath = export_.fileUrl.replace('file://', '');
    const stream = fs.createReadStream(filePath);

    reply
      .header('Content-Type', 'application/octet-stream')
      .header('Content-Disposition', `attachment; filename="${filePath.split('/').pop()}"`)
      .send(stream);
  }

  @Post('elster/submit/:runId')
  @ApiOperation({ summary: 'Manually trigger ELSTER Lohnsteuer-Anmeldung for a run' })
  async elsterSubmit(@Param('runId') runId: string) {
    const run = await this.prisma.payrollRun.findUniqueOrThrow({ where: { id: runId } });
    await this.elsterService.submitForPeriod({
      year: run.periodYear,
      month: run.periodMonth,
    });
    return { message: 'Submission queued' };
  }

  @Get('elster/submissions')
  @ApiOperation({ summary: 'List ELSTER submissions' })
  async elsterSubmissions() {
    return this.prisma.elsterSubmission.findMany({ orderBy: { createdAt: 'desc' } });
  }
}
