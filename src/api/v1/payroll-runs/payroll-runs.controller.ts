import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../../database/prisma.service';
import { PayrollService } from '../../../payroll/payroll.service';
import { FastifyReply } from 'fastify';
import * as fs from 'fs';

class TriggerPayrollRunDto {
  year!: number;
  month!: number;
  triggeredBy?: string;
}

@ApiTags('payroll-runs')
@Controller('api/v1/payroll-runs')
export class PayrollRunsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payrollService: PayrollService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List payroll runs' })
  async findAll() {
    return this.prisma.payrollRun.findMany({ orderBy: { periodYear: 'desc' } });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payroll run by ID' })
  async findOne(@Param('id') id: string) {
    return this.prisma.payrollRun.findUniqueOrThrow({ where: { id } });
  }

  @Get(':id/entries')
  @ApiOperation({ summary: 'List payroll entries for a run' })
  async entries(@Param('id') id: string) {
    return this.prisma.payrollEntry.findMany({
      where: { payrollRunId: id },
      include: { employee: { select: { id: true, vorname: true, nachname: true } } },
    });
  }

  @Post()
  @HttpCode(202)
  @ApiOperation({ summary: 'Trigger a manual payroll run' })
  async trigger(@Body() body: TriggerPayrollRunDto) {
    const runId = await this.payrollService.initiateRun({
      year: body.year,
      month: body.month,
    });

    const employees = await this.prisma.employee.findMany({
      where: { active: true },
      select: { id: true },
    });

    const errors: string[] = [];
    for (const emp of employees) {
      try {
        await this.payrollService.runForEmployee(emp.id, { year: body.year, month: body.month }, runId);
      } catch (err) {
        errors.push(emp.id);
      }
    }

    if (errors.length === 0) {
      await this.payrollService.completeRun(runId);
    } else {
      await this.payrollService.failRun(runId, `Failed for: ${errors.join(', ')}`);
    }

    return { runId, errors };
  }

  @Get(':runId/employees/:employeeId/payslip')
  @ApiOperation({ summary: 'Download payslip PDF for an employee in a run' })
  async payslip(
    @Param('runId') runId: string,
    @Param('employeeId') employeeId: string,
    @Res() reply: FastifyReply,
  ) {
    const entry = await this.prisma.payrollEntry.findUniqueOrThrow({
      where: { payrollRunId_employeeId: { payrollRunId: runId, employeeId } },
    });

    if (!entry.payslipUrl) {
      reply.status(404).send({ message: 'Payslip not yet generated' });
      return;
    }

    const filePath = entry.payslipUrl.replace('file://', '');
    const stream = fs.createReadStream(filePath);

    reply
      .header('Content-Type', 'application/pdf')
      .header(
        'Content-Disposition',
        `attachment; filename="payslip-${employeeId}.pdf"`,
      )
      .send(stream);
  }
}
