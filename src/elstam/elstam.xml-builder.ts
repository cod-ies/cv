import { Injectable } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import {
  AnmeldungRequest,
  AbrufRequest,
  AbmeldungRequest,
} from './dto/elstam-request.dto';

const NS = 'http://www.elster.de/elsterxml/schema/v12';

@Injectable()
export class ElstamXmlBuilder {
  private envelope(transferTicket: string, nutzdaten: object): string {
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('Elster', { xmlns: NS })
        .ele('TransferHeader')
          .ele('Verfahren').txt('ElsterAnmeldung').up()
          .ele('DatenArt').txt('ELStAM').up()
          .ele('TransferTicket').txt(transferTicket).up()
        .up()
        .ele('DatenTeil')
          .ele('Nutzdatenblock')
            .ele('NutzdatenHeader')
              .ele('NutzdatenTicket').txt('000000001').up()
            .up()
            .ele('Nutzdaten')
              .import(create(nutzdaten))
            .up()
          .up()
        .up()
      .up();

    return doc.end({ prettyPrint: false });
  }

  buildAnmeldung(req: AnmeldungRequest, ticket: string): string {
    const body = {
      ELStAMAnmeldung: {
        '@xmlns': NS,
        IDNr: req.steuerId,
        Arbeitgeber: {
          Steuernummer: req.arbeitgeberSteuernummer,
          Bundesland: req.arbeitgeberBundesland,
        },
        BeschaeftigungBeginn: req.beschaeftigungBeginn
          .toISOString()
          .substring(0, 10),
      },
    };
    return this.envelope(ticket, body);
  }

  buildAbruf(req: AbrufRequest, ticket: string): string {
    const refMonat = `${req.referenzmonatYear}-${String(req.referenzmonatMonth).padStart(2, '0')}`;
    const body = {
      ELStAMAbruf: {
        '@xmlns': NS,
        IDNr: req.steuerId,
        Arbeitgeber: { Steuernummer: req.arbeitgeberSteuernummer },
        Referenzmonat: refMonat,
      },
    };
    return this.envelope(ticket, body);
  }

  buildAbmeldung(req: AbmeldungRequest, ticket: string): string {
    const body = {
      ELStAMAbmeldung: {
        '@xmlns': NS,
        IDNr: req.steuerId,
        Arbeitgeber: { Steuernummer: req.arbeitgeberSteuernummer },
        BeschaeftigungEnde: req.beschaeftigungEnde
          .toISOString()
          .substring(0, 10),
      },
    };
    return this.envelope(ticket, body);
  }
}
