import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GrossPayEngine } from './engines/gross-pay.engine';
import { LohnsteuerEngine2025, getLohnsteuerEngine } from './engines/lohnsteuer.engine';
import { berechneKirchensteuer } from './engines/kirchensteuer.engine';
import { berechneSVBeitraege } from './engines/sozialversicherung.engine';
import { SV_2025 } from './tables/2025-sv-beitragssatz';
import { PayrollResult } from './dto/payroll-result.dto';
import { YearMonth, GermanState } from '../common/types/money';
import Decimal from 'decimal.js';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly grossPayEngine: GrossPayEngine,
  ) {}

  async runForEmployee(
    employeeId: string,
    period: YearMonth,
    payrollRunId: string,
  ): Promise<PayrollResult> {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { id: employeeId },
    });

    // Get current tax features
    const taxFeature = await this.prisma.taxFeature.findFirst({
      where: {
        employeeId,
        validFrom: { lte: new Date(period.year, period.month - 1, 1) },
        OR: [{ validTo: null }, { validTo: { gte: new Date(period.year, period.month - 1, 1) } }],
      },
      orderBy: { validFrom: 'desc' },
    });

    if (!taxFeature) {
      throw new Error(`No tax features found for employee ${employeeId} in ${period.year}-${period.month}`);
    }

    // Get shifts for the period
    const shifts = await this.prisma.shift.findMany({
      where: {
        employeeId,
        startedAt: {
          gte: new Date(period.year, period.month - 1, 1),
          lt: new Date(period.year, period.month, 1),
        },
      },
    });

    // Gross pay
    const bruttoEntgeltCents = this.grossPayEngine.calculate(
      shifts.map((s) => ({
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        breakMinutes: s.breakMinutes,
        hourlyRateCents: s.hourlyRateCents,
      })),
    );

    // YTD from previous entries
    const ytdPrev = await this.prisma.payrollEntry.aggregate({
      where: {
        employeeId,
        payrollRun: {
          periodYear: period.year,
          periodMonth: { lt: period.month },
        },
      },
      _sum: { bruttoEntgeltCents: true, lohnsteuerCents: true },
    });

    const ytdBruttoBefore = ytdPrev._sum.bruttoEntgeltCents ?? 0n;
    const ytdLstBefore = ytdPrev._sum.lohnsteuerCents ?? 0n;

    // Lohnsteuer
    const engine = getLohnsteuerEngine(period.year);
    const kirchenpflichtig = taxFeature.kirchensteuerMerkmal !== null;
    const lstResult = engine.calculate({
      bruttoMonatCents: bruttoEntgeltCents,
      steuerklasse: taxFeature.steuerklasse as 1 | 2 | 3 | 4 | 5 | 6,
      kinderfreibetrag: new Decimal(taxFeature.kinderfreibetrag.toString()),
      kirchensteuerpflichtig: kirchenpflichtig,
      gesetzlichKrankenversichert: true, // default; extend with employee flag
      jahresArbeitslohnBisherCents: ytdBruttoBefore,
      year: period.year,
    });

    // Kirchensteuer
    const bundeslandCode = employee.bundesland.replace('DE-', '') as GermanState;
    const kirchensteuerCents = berechneKirchensteuer(
      lstResult.lohnsteuerMonatCents,
      bundeslandCode,
      kirchenpflichtig,
    );

    // Sozialversicherung
    const svSaetze = period.year === 2025 ? SV_2025 : SV_2025;
    const ostBundeslaender = ['BB', 'MV', 'SN', 'ST', 'TH'];
    const isOst = ostBundeslaender.includes(bundeslandCode);

    const svBeitraege = berechneSVBeitraege({
      bruttoMonatCents: bruttoEntgeltCents,
      saetze: svSaetze,
      isOst,
      kinderlos: new Decimal(taxFeature.kinderfreibetrag.toString()).eq(0),
      privatKrankenversichert: false,
    });

    // Net pay
    const totalAbzuegeAN =
      lstResult.lohnsteuerMonatCents +
      lstResult.soliMonatCents +
      kirchensteuerCents +
      svBeitraege.kvAnCents +
      svBeitraege.pvAnCents +
      svBeitraege.rvAnCents +
      svBeitraege.avAnCents;

    const nettoEntgeltCents = bruttoEntgeltCents > totalAbzuegeAN
      ? bruttoEntgeltCents - totalAbzuegeAN
      : 0n;

    const result: PayrollResult = {
      bruttoEntgeltCents,
      lohnsteuerCents: lstResult.lohnsteuerMonatCents,
      soliCents: lstResult.soliMonatCents,
      kirchensteuerCents,
      svBeitraege,
      nettoEntgeltCents,
      ytdBruttoCents: ytdBruttoBefore + bruttoEntgeltCents,
      ytdLohnsteuerCents: ytdLstBefore + lstResult.lohnsteuerMonatCents,
    };

    // Persist
    await this.prisma.payrollEntry.upsert({
      where: {
        payrollRunId_employeeId: { payrollRunId, employeeId },
      },
      create: {
        payrollRunId,
        employeeId,
        taxFeatureId: taxFeature.id,
        bruttoEntgeltCents: result.bruttoEntgeltCents,
        lohnsteuerCents: result.lohnsteuerCents,
        soliCents: result.soliCents,
        kirchensteuerCents: result.kirchensteuerCents,
        kvAnCents: svBeitraege.kvAnCents,
        pvAnCents: svBeitraege.pvAnCents,
        rvAnCents: svBeitraege.rvAnCents,
        avAnCents: svBeitraege.avAnCents,
        kvAgCents: svBeitraege.kvAgCents,
        pvAgCents: svBeitraege.pvAgCents,
        rvAgCents: svBeitraege.rvAgCents,
        avAgCents: svBeitraege.avAgCents,
        nettoEntgeltCents: result.nettoEntgeltCents,
        ytdBruttoCents: result.ytdBruttoCents,
        ytdLohnsteuerCents: result.ytdLohnsteuerCents,
      },
      update: {
        taxFeatureId: taxFeature.id,
        bruttoEntgeltCents: result.bruttoEntgeltCents,
        lohnsteuerCents: result.lohnsteuerCents,
        soliCents: result.soliCents,
        kirchensteuerCents: result.kirchensteuerCents,
        kvAnCents: svBeitraege.kvAnCents,
        pvAnCents: svBeitraege.pvAnCents,
        rvAnCents: svBeitraege.rvAnCents,
        avAnCents: svBeitraege.avAnCents,
        kvAgCents: svBeitraege.kvAgCents,
        pvAgCents: svBeitraege.pvAgCents,
        rvAgCents: svBeitraege.rvAgCents,
        avAgCents: svBeitraege.avAgCents,
        nettoEntgeltCents: result.nettoEntgeltCents,
        ytdBruttoCents: result.ytdBruttoCents,
        ytdLohnsteuerCents: result.ytdLohnsteuerCents,
      },
    });

    this.logger.debug(
      `Payroll calculated for employee ${employeeId}: brutto=${bruttoEntgeltCents}ct netto=${nettoEntgeltCents}ct`,
    );

    return result;
  }

  async initiateRun(period: YearMonth): Promise<string> {
    const run = await this.prisma.payrollRun.upsert({
      where: { periodYear_periodMonth: { periodYear: period.year, periodMonth: period.month } },
      create: {
        periodYear: period.year,
        periodMonth: period.month,
        status: 'running',
        startedAt: new Date(),
      },
      update: { status: 'running', startedAt: new Date() },
    });
    return run.id;
  }

  async completeRun(payrollRunId: string): Promise<void> {
    await this.prisma.payrollRun.update({
      where: { id: payrollRunId },
      data: { status: 'completed', completedAt: new Date() },
    });
  }

  async failRun(payrollRunId: string, error: string): Promise<void> {
    await this.prisma.payrollRun.update({
      where: { id: payrollRunId },
      data: { status: 'failed' },
    });
    this.logger.error(`Payroll run ${payrollRunId} failed: ${error}`);
  }
}
