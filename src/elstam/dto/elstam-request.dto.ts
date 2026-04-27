import { KirchensteuerMerkmal, Steuerklasse } from '../../common/types/money';

export interface AnmeldungRequest {
  steuerId: string;
  beschaeftigungBeginn: Date;
  arbeitgeberSteuernummer: string;
  arbeitgeberBundesland: string;
}

export interface AbrufRequest {
  steuerId: string;
  referenzmonatYear: number;
  referenzmonatMonth: number;
  arbeitgeberSteuernummer: string;
}

export interface AbmeldungRequest {
  steuerId: string;
  beschaeftigungEnde: Date;
  arbeitgeberSteuernummer: string;
}

export interface ILohnsteuerabzugsmerkmale {
  steuerklasse: Steuerklasse;
  kinderfreibetrag: string;   // Decimal-safe string, e.g. "1.5"
  kirchensteuerMerkmal: KirchensteuerMerkmal;
  faktorverfahren: string | null;
  validFrom: Date;
  validTo: Date | null;
}
