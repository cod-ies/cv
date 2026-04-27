import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { EricService } from '../eric/eric.service';
import {
  ElsterSubmissionXmlBuilder,
} from './elster-submission.xml-builder';
import { YearMonth } from '../common/types/money';
import { randomUUID } from 'crypto';

@Injectable()
export class ElsterSubmissionService {
  private readonly logger = new Logger(ElsterSubmissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eric: EricService,
    private readonly xmlBuilder: ElsterSubmissionXmlBuilder,
    private readonly config: ConfigService,
  ) {}

  async submitForPeriod(period: YearMonth): Promise<void> {
    const run = await this.prisma.payrollRun.findUniqueOrThrow({
      where: {
        periodYear_periodMonth: {
          periodYear: period.year,
          periodMonth: period.month,
        },
      },
      include: {
        entries: {
          select: {
            lohnsteuerCents: true,
            soliCents: true,
            kirchensteuerCents: true,
          },
        },
      },
    });

    // Aggregate totals
    let totalLst = 0n;
    let totalSoli = 0n;
    let totalKst = 0n;
    for (const e of run.entries) {
      totalLst += e.lohnsteuerCents;
      totalSoli += e.soliCents;
      totalKst += e.kirchensteuerCents;
    }

    const ticket = randomUUID();
    const xml = this.xmlBuilder.buildLohnsteuerAnmeldung({
      periodYear: period.year,
      periodMonth: period.month,
      arbeitgeberSteuernummer: this.config.get<string>('company.steuernummer')!,
      arbeitgeberBundesland: this.config.get<string>('company.bundesland')!,
      totalLstCents: totalLst,
      totalSoliCents: totalSoli,
      totalKstCents: totalKst,
      transferTicket: ticket,
    });

    const submission = await this.prisma.elsterSubmission.create({
      data: {
        payrollRunId: run.id,
        periodYear: period.year,
        periodMonth: period.month,
        totalLstCents: totalLst,
        totalSoliCents: totalSoli,
        totalKstCents: totalKst,
        status: 'pending',
      },
    });

    let ericRc: number | null = null;
    let responseXml: string | null = null;
    let status = 'submitted';
    let transferTicketReceived: string | null = ticket;

    try {
      const result = await this.eric.signAndSubmit(xml, 'LStA');
      ericRc = result.returnCode;
      responseXml = result.responseXml;
      this.logger.log(
        `ELSTER Lohnsteuer-Anmeldung submitted for ${period.year}-${period.month}; rc=${ericRc}`,
      );
    } catch (err) {
      status = 'failed';
      this.logger.error('ELSTER submission failed', err);
    }

    await this.prisma.elsterSubmission.update({
      where: { id: submission.id },
      data: {
        status,
        ericReturnCode: ericRc,
        responseXml,
        transferTicket: transferTicketReceived,
        submittedAt: new Date(),
      },
    });
  }
}
