import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { renderPayslipHtml } from './templates/payslip.html';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class PayslipService {
  private readonly logger = new Logger(PayslipService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async generateForEntry(payrollEntryId: string): Promise<string> {
    const entry = await this.prisma.payrollEntry.findUniqueOrThrow({
      where: { id: payrollEntryId },
      include: { employee: true, taxFeature: true, payrollRun: true },
    });

    const html = renderPayslipHtml({
      entry: entry as Parameters<typeof renderPayslipHtml>[0]['entry'],
      periodYear: entry.payrollRun.periodYear,
      periodMonth: entry.payrollRun.periodMonth,
      companyName: this.config.get<string>('company.name') ?? '',
    });

    const pdfBytes = await this.renderHtmlToPdf(html);

    // Store PDF — write to local filesystem (replace with S3 in production)
    const outputDir = '/tmp/payslips';
    await fs.mkdir(outputDir, { recursive: true });
    const filename = `payslip-${payrollEntryId}.pdf`;
    const filePath = path.join(outputDir, filename);
    await fs.writeFile(filePath, pdfBytes);

    const url = `file://${filePath}`;

    await this.prisma.payrollEntry.update({
      where: { id: payrollEntryId },
      data: { payslipUrl: url },
    });

    this.logger.log(`Payslip generated: ${filePath}`);
    return url;
  }

  private async renderHtmlToPdf(html: string): Promise<Buffer> {
    // Dynamic import to avoid startup cost when Puppeteer is not needed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const puppeteer = require('puppeteer-core') as typeof import('puppeteer-core');

    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH ?? '/usr/bin/chromium-browser';

    const browser = await puppeteer.launch({
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        printBackground: false,
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
