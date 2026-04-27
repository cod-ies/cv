import { ElstamXmlBuilder } from './elstam.xml-builder';
import { XMLParser } from 'fast-xml-parser';

describe('ElstamXmlBuilder', () => {
  let builder: ElstamXmlBuilder;
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

  beforeEach(() => {
    builder = new ElstamXmlBuilder();
  });

  describe('buildAnmeldung', () => {
    it('produces valid XML with required fields', () => {
      const xml = builder.buildAnmeldung(
        {
          steuerId: '12345678901',
          beschaeftigungBeginn: new Date('2025-01-01'),
          arbeitgeberSteuernummer: '12/345/67890',
          arbeitgeberBundesland: 'NW',
        },
        'test-ticket-001',
      );

      expect(xml).toMatch(/<?xml/);
      const obj = parser.parse(xml);
      expect(obj.Elster).toBeDefined();
      expect(obj.Elster.TransferHeader.TransferTicket).toBe('test-ticket-001');
    });

    it('includes Steuer-ID in Anmeldung payload', () => {
      const xml = builder.buildAnmeldung(
        {
          steuerId: '98765432100',
          beschaeftigungBeginn: new Date('2025-03-01'),
          arbeitgeberSteuernummer: '12/345/67890',
          arbeitgeberBundesland: 'BY',
        },
        'ticket-002',
      );
      expect(xml).toContain('98765432100');
    });
  });

  describe('buildAbruf', () => {
    it('includes referenzmonat in the payload', () => {
      const xml = builder.buildAbruf(
        {
          steuerId: '12345678901',
          referenzmonatYear: 2025,
          referenzmonatMonth: 3,
          arbeitgeberSteuernummer: '12/345/67890',
        },
        'ticket-003',
      );
      expect(xml).toContain('2025-03');
    });
  });

  describe('buildAbmeldung', () => {
    it('includes BeschaeftigungEnde in the payload', () => {
      const xml = builder.buildAbmeldung(
        {
          steuerId: '12345678901',
          beschaeftigungEnde: new Date('2025-12-31'),
          arbeitgeberSteuernummer: '12/345/67890',
        },
        'ticket-004',
      );
      expect(xml).toContain('2025-12-31');
    });
  });
});
