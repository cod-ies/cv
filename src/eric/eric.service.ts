import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ERIC_OK, EricError } from './types/eric-return-codes';

// Loaded at runtime — may be the stub when building without the native SDK.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ericBinding = require('../../native/eric-binding/index.js') as {
  init(logPath: string): Promise<number>;
  shutdown(): void;
  createKey(certPath: string, password: string): Promise<number>;
  sende(
    xmlData: string,
    datenartVersion: string,
  ): Promise<{ returnCode: number; responseXml: string }>;
};

export interface EricSubmitResult {
  returnCode: number;
  responseXml: string;
}

@Injectable()
export class EricService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EricService.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const logPath = this.config.get<string>('eric.logPath')!;
    const certPath = this.config.get<string>('eric.certPath')!;
    const certPassword = this.config.get<string>('eric.certPassword')!;

    const initRc = await ericBinding.init(logPath);
    if (initRc !== ERIC_OK) {
      throw new EricError(initRc, 'EricInitialisierung');
    }
    this.logger.log('ERiC library initialized');

    const keyRc = await ericBinding.createKey(certPath, certPassword);
    if (keyRc !== ERIC_OK) {
      throw new EricError(keyRc, 'EricCreateKey');
    }
    this.logger.log('ERiC certificate loaded');
  }

  async onModuleDestroy(): Promise<void> {
    ericBinding.shutdown();
    this.logger.log('ERiC library shut down');
  }

  async signAndSubmit(
    xmlPayload: string,
    datenartVersion = 'LStA',
  ): Promise<EricSubmitResult> {
    const result = await ericBinding.sende(xmlPayload, datenartVersion);
    if (result.returnCode !== ERIC_OK) {
      throw new EricError(result.returnCode, 'EricSende');
    }
    return result;
  }
}
