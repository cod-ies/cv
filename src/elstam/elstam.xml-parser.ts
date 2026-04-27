import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { ILohnsteuerabzugsmerkmale } from './dto/elstam-request.dto';
import {
  KirchensteuerMerkmal,
  Steuerklasse,
} from '../common/types/money';

@Injectable()
export class ElstamXmlParser {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: true,
  });

  parseLohnsteuerabzugsmerkmale(
    responseXml: string,
  ): ILohnsteuerabzugsmerkmale | null {
    const obj = this.parser.parse(responseXml);
    const nutzdaten =
      obj?.Elster?.DatenTeil?.Nutzdatenblock?.Nutzdaten;

    if (!nutzdaten) return null;

    const merkmal =
      nutzdaten.ELStAMMerkmal ?? nutzdaten['elstam:ELStAMMerkmal'];

    if (!merkmal) return null;

    const kirchenRaw: string | undefined = merkmal.Kirchensteuer;
    const kirchensteuerMerkmal: KirchensteuerMerkmal =
      kirchenRaw === 'EV' ? 'ev'
      : kirchenRaw === 'RK' ? 'rk'
      : kirchenRaw === 'AK' ? 'ak'
      : null;

    const validFromStr: string = merkmal.GueltigAb ?? '';
    const validToStr: string | undefined = merkmal.GueltigBis;

    return {
      steuerklasse: (Number(merkmal.Steuerklasse) as Steuerklasse) ?? 1,
      kinderfreibetrag: String(merkmal.Kinderfreibetrag ?? '0.0'),
      kirchensteuerMerkmal,
      faktorverfahren: merkmal.Faktor ? String(merkmal.Faktor) : null,
      validFrom: new Date(validFromStr),
      validTo: validToStr ? new Date(validToStr) : null,
    };
  }

  parseTransferTicket(responseXml: string): string | null {
    const obj = this.parser.parse(responseXml);
    return (
      obj?.Elster?.TransferHeader?.TransferTicket ?? null
    );
  }
}
