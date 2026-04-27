import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { ShiftpilotEmployeeDto } from './dto/employee.dto';
import { ShiftpilotShiftDto } from './dto/shift.dto';
import { YearMonth } from '../common/types/money';

@Injectable()
export class ShiftpilotClient {
  private readonly logger = new Logger(ShiftpilotClient.name);
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    this.http = axios.create({
      baseURL: this.config.get<string>('shiftpilot.baseUrl'),
      headers: {
        Authorization: `Bearer ${this.config.get<string>('shiftpilot.apiKey')}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    });
  }

  async getEmployees(): Promise<ShiftpilotEmployeeDto[]> {
    this.logger.debug('Fetching employees from ShiftPilot');
    const resp = await this.http.get<{ data: ShiftpilotEmployeeDto[] }>(
      '/employees',
      { params: { limit: 500 } },
    );
    return resp.data.data;
  }

  async getShiftsForMonth(
    period: YearMonth,
  ): Promise<ShiftpilotShiftDto[]> {
    const from = new Date(period.year, period.month - 1, 1);
    const to = new Date(period.year, period.month, 0); // last day of month
    this.logger.debug(
      `Fetching shifts from ShiftPilot for ${from.toISOString().substring(0, 10)}–${to.toISOString().substring(0, 10)}`,
    );

    const results: ShiftpilotShiftDto[] = [];
    let page = 1;

    while (true) {
      const resp = await this.http.get<{
        data: ShiftpilotShiftDto[];
        meta: { totalPages: number };
      }>('/shifts', {
        params: {
          from: from.toISOString().substring(0, 10),
          to: to.toISOString().substring(0, 10),
          page,
          limit: 200,
        },
      });

      results.push(...resp.data.data);

      if (page >= resp.data.meta.totalPages) break;
      page++;
    }

    return results;
  }
}
