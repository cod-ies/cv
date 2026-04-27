import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import * as fs from 'fs';

@Injectable()
export class ElstamHttpClient implements OnModuleInit {
  private readonly logger = new Logger(ElstamHttpClient.name);
  private http!: AxiosInstance;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const certPath = this.config.get<string>('eric.certPath')!;
    const certPassword = this.config.get<string>('eric.certPassword')!;
    const baseUrl = this.config.get<string>('elstam.baseUrl')!;

    let pfx: Buffer | undefined;
    try {
      pfx = fs.readFileSync(certPath);
    } catch {
      this.logger.warn(
        `ELSTER certificate not found at ${certPath} — ELStAM HTTP calls will fail in production`,
      );
    }

    const httpsAgent = new https.Agent({
      pfx,
      passphrase: certPassword,
      rejectUnauthorized: true,
    });

    this.http = axios.create({
      baseURL: baseUrl,
      httpsAgent,
      headers: { 'Content-Type': 'application/xml; charset=UTF-8' },
      timeout: 60_000,
    });
  }

  async post(xmlBody: string): Promise<string> {
    const resp = await this.http.post<string>('', xmlBody);
    return resp.data;
  }
}
