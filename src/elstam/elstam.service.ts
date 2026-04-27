import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { ElstamHttpClient } from './elstam.http-client';
import { ElstamXmlBuilder } from './elstam.xml-builder';
import { ElstamXmlParser } from './elstam.xml-parser';
import {
  AnmeldungRequest,
  AbrufRequest,
  AbmeldungRequest,
  ILohnsteuerabzugsmerkmale,
} from './dto/elstam-request.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class ElstamService {
  private readonly logger = new Logger(ElstamService.name);

  constructor(
    private readonly httpClient: ElstamHttpClient,
    private readonly xmlBuilder: ElstamXmlBuilder,
    private readonly xmlParser: ElstamXmlParser,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get arbeitgeberSteuernummer(): string {
    return this.config.get<string>('company.steuernummer')!;
  }

  async registerEmployee(
    employeeId: string,
    steuerId: string,
    beschaeftigungBeginn: Date,
  ): Promise<void> {
    const ticket = randomUUID();
    const req: AnmeldungRequest = {
      steuerId,
      beschaeftigungBeginn,
      arbeitgeberSteuernummer: this.arbeitgeberSteuernummer,
      arbeitgeberBundesland: this.config.get<string>('company.bundesland')!,
    };

    const xml = this.xmlBuilder.buildAnmeldung(req, ticket);

    let responseXml = '';
    let ericRc: number | null = null;
    let status = 'submitted';

    try {
      responseXml = await this.httpClient.post(xml);
    } catch (err) {
      status = 'failed';
      this.logger.error(`ELStAM Anmeldung failed for ${steuerId}`, err);
    }

    await this.prisma.elstamRegistration.create({
      data: {
        employeeId,
        type: 'anmeldung',
        status,
        beschaeftigungBeginn,
        requestXml: xml,
        responseXml: responseXml || null,
        ericReturnCode: ericRc,
      },
    });
  }

  async fetchTaxFeatures(
    employeeId: string,
    steuerId: string,
    referenzmonatYear: number,
    referenzmonatMonth: number,
  ): Promise<ILohnsteuerabzugsmerkmale | null> {
    const ticket = randomUUID();
    const req: AbrufRequest = {
      steuerId,
      referenzmonatYear,
      referenzmonatMonth,
      arbeitgeberSteuernummer: this.arbeitgeberSteuernummer,
    };

    const xml = this.xmlBuilder.buildAbruf(req, ticket);
    let responseXml = '';

    try {
      responseXml = await this.httpClient.post(xml);
    } catch (err) {
      this.logger.error(`ELStAM Abruf failed for ${steuerId}`, err);
      return null;
    }

    const merkmale = this.xmlParser.parseLohnsteuerabzugsmerkmale(responseXml);

    if (merkmale) {
      const validFromDate = merkmale.validFrom;

      await this.prisma.taxFeature.upsert({
        where: {
          employeeId_validFrom: {
            employeeId,
            validFrom: validFromDate,
          },
        },
        create: {
          employeeId,
          steuerklasse: merkmale.steuerklasse,
          kinderfreibetrag: merkmale.kinderfreibetrag,
          kirchensteuerMerkmal: merkmale.kirchensteuerMerkmal ?? undefined,
          faktorverfahren: merkmale.faktorverfahren ?? undefined,
          validFrom: validFromDate,
          validTo: merkmale.validTo ?? undefined,
          rawXml: responseXml,
        },
        update: {
          steuerklasse: merkmale.steuerklasse,
          kinderfreibetrag: merkmale.kinderfreibetrag,
          kirchensteuerMerkmal: merkmale.kirchensteuerMerkmal ?? undefined,
          faktorverfahren: merkmale.faktorverfahren ?? undefined,
          validTo: merkmale.validTo ?? undefined,
          rawXml: responseXml,
          fetchedAt: new Date(),
        },
      });
    }

    return merkmale;
  }

  async deregisterEmployee(
    employeeId: string,
    steuerId: string,
    beschaeftigungEnde: Date,
  ): Promise<void> {
    const ticket = randomUUID();
    const req: AbmeldungRequest = {
      steuerId,
      beschaeftigungEnde,
      arbeitgeberSteuernummer: this.arbeitgeberSteuernummer,
    };

    const xml = this.xmlBuilder.buildAbmeldung(req, ticket);
    let responseXml = '';
    let status = 'submitted';

    try {
      responseXml = await this.httpClient.post(xml);
    } catch (err) {
      status = 'failed';
      this.logger.error(`ELStAM Abmeldung failed for ${steuerId}`, err);
    }

    await this.prisma.elstamRegistration.create({
      data: {
        employeeId,
        type: 'abmeldung',
        status,
        beschaeftigungEnde,
        requestXml: xml,
        responseXml: responseXml || null,
      },
    });

    if (status === 'submitted') {
      await this.prisma.employee.update({
        where: { id: employeeId },
        data: { active: false },
      });
    }
  }
}
