import { Injectable } from '@nestjs/common';
import { create } from 'xmlbuilder2';

const NS = 'http://www.elster.de/elsterxml/schema/v12';

export interface LStAnmeldungData {
  periodYear: number;
  periodMonth: number;
  arbeitgeberSteuernummer: string;
  arbeitgeberBundesland: string;
  totalLstCents: bigint;
  totalSoliCents: bigint;
  totalKstCents: bigint;
  transferTicket: string;
}

@Injectable()
export class ElsterSubmissionXmlBuilder {
  /**
   * Build an ELSTER Lohnsteuer-Anmeldung (§ 41a EStG) XML payload.
   * Periodicity: monthly (Voranmeldung).
   */
  buildLohnsteuerAnmeldung(data: LStAnmeldungData): string {
    const zeitraum = `${data.periodYear}${String(data.periodMonth).padStart(2, '0')}`;

    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('Elster', { xmlns: NS })
        .ele('TransferHeader')
          .ele('Verfahren').txt('ElsterAnmeldung').up()
          .ele('DatenArt').txt('LStA').up()
          .ele('Vorgang').txt('send-Auth').up()
          .ele('TransferTicket').txt(data.transferTicket).up()
        .up()
        .ele('DatenTeil')
          .ele('Nutzdatenblock')
            .ele('NutzdatenHeader')
              .ele('NutzdatenTicket').txt('000000001').up()
              .ele('Empfaenger')
                .ele('id').txt(data.arbeitgeberBundesland).up()
              .up()
            .up()
            .ele('Nutzdaten')
              .ele('Anmeldungssteuern')
                .ele('Art').txt('LStA').up()
                .ele('Zeitraum').txt(zeitraum).up()
                .ele('Steuernummer').txt(data.arbeitgeberSteuernummer).up()
                .ele('Lohnsteuer')
                  .ele('Lohnsteuer').txt(centsToEuroStr(data.totalLstCents)).up()
                  .ele('Solidaritaetszuschlag').txt(centsToEuroStr(data.totalSoliCents)).up()
                  .ele('Kirchensteuer').txt(centsToEuroStr(data.totalKstCents)).up()
                .up()
              .up()
            .up()
          .up()
        .up()
      .up();

    return doc.end({ prettyPrint: false });
  }
}

function centsToEuroStr(cents: bigint): string {
  const euro = Number(cents) / 100;
  return euro.toFixed(2);
}
