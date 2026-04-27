import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { mapToDATEV } from './datev.mapper';
import { writeDatevFile } from './datev.writer';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class DatevService {
  private readonly logger = new Logger(DatevService.name);

  constructor(private readonly prisma: PrismaService) {}

  async exportForRun(payrollRunId: string): Promise<string> {
    const run = await this.prisma.payrollRun.findUniqueOrThrow({
      where: { id: payrollRunId },
      include: {
        entries: { include: { employee: true } },
      },
    });

    const records = mapToDATEV(
      run.entries as Parameters<typeof mapToDATEV>[0],
    );
    const fileBuffer = writeDatevFile(
      records,
      run.periodYear,
      run.periodMonth,
    );

    const outputDir = '/tmp/datev-exports';
    await fs.mkdir(outputDir, { recursive: true });
    const filename = `datev-${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}-${payrollRunId.substring(0, 8)}.loh`;
    const filePath = path.join(outputDir, filename);
    await fs.writeFile(filePath, fileBuffer);

    const export_ = await this.prisma.datevExport.create({
      data: { payrollRunId, fileUrl: `file://${filePath}` },
    });

    this.logger.log(`DATEV export written: ${filePath}`);
    return export_.id;
  }
}
