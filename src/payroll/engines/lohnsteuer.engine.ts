import Decimal from 'decimal.js';
import { EuroCents, Steuerklasse } from '../../common/types/money';

export interface LohnsteuerInput {
  /** Monatlicher Bruttoarbeitslohn in Cent */
  bruttoMonatCents: EuroCents;
  steuerklasse: Steuerklasse;
  /** Kinderfreibetrag (z.B. 0.5, 1.0, 2.5) */
  kinderfreibetrag: Decimal;
  /** Hat Kirchensteuerpflicht */
  kirchensteuerpflichtig: boolean;
  /** Gesetzlich (true) oder privat (false) krankenversichert */
  gesetzlichKrankenversichert: boolean;
  /** Jahresarbeitslohn bisher (für Jahrestabelle) in Cent */
  jahresArbeitslohnBisherCents: EuroCents;
  /** Tax year */
  year: number;
}

export interface LohnsteuerResult {
  lohnsteuerMonatCents: EuroCents;
  soliMonatCents: EuroCents;
}

/**
 * Implementierung des BMF Programmablaufplans für die maschinelle Berechnung
 * der Lohnsteuer 2025 (§ 39b EStG).
 *
 * Vereinfachte Implementierung für den allgemeinen Fall.
 * Nicht berücksichtigt: Altersentlastungsbetrag, außerordentliche Bezüge,
 * Versorgungsbezüge, DBA-Fälle. Diese sind gesondert zu implementieren.
 *
 * Quelle: BMF-Schreiben vom 05.12.2024 – IV C 5 – S 2361/19/10007 :010
 * Programmablaufplan 2025: https://www.bundesfinanzministerium.de
 */
export class LohnsteuerEngine2025 {
  private readonly year = 2025;

  // ─── Steuerrechtliche Grundgrößen 2025 (§ 32a EStG) ─────────────────────
  private readonly GRUNDFREIBETRAG = new Decimal('11784');    // €
  private readonly ZONE2_GRENZE    = new Decimal('17005');
  private readonly ZONE3_GRENZE    = new Decimal('66761');
  private readonly ZONE4_GRENZE    = new Decimal('277826');
  private readonly ARBEITNEHMER_PAUSCHBETRAG = new Decimal('1230'); // §9a Nr.1a EStG
  private readonly SONDERAUSGABEN_PAUSCHBETRAG = new Decimal('36');
  private readonly KINDERFREIBETRAG_JE_KIND = new Decimal('4800');  // §32 Abs.6 EStG halber je Elternteil × 2 = 4800; vereinfacht Alleinstehende SK2: ×2

  // Vorsorgeaufwendungen (vereinfacht, § 10 EStG)
  private readonly KV_BASISANTEIL   = new Decimal('0.073');
  private readonly PV_BASISANTEIL   = new Decimal('0.017');
  private readonly RV_ANTEIL        = new Decimal('0.093');
  private readonly AV_ANTEIL        = new Decimal('0.013');

  // Soli
  private readonly SOLI_SATZ = new Decimal('0.055');
  private readonly SOLI_FREIGRENZE_LST = new Decimal('18130'); // jährlich

  calculate(input: LohnsteuerInput): LohnsteuerResult {
    const {
      bruttoMonatCents,
      steuerklasse,
      kinderfreibetrag,
      gesetzlichKrankenversichert,
    } = input;

    // Schritt 1: Jahresarbeitslohn hochrechnen (monatlich → jährlich)
    const jbCents = new Decimal(bruttoMonatCents.toString()).times(12);
    const jb = jbCents.dividedBy(100); // in Euro

    // Schritt 2: Arbeitnehmer-Pauschbetrag / Werbungskosten-Pauschale
    const werbungskosten =
      steuerklasse === 6
        ? new Decimal(0)
        : this.ARBEITNEHMER_PAUSCHBETRAG;

    // Schritt 3: Vorsorgeaufwendungen (Socialbeiträge, vereinfacht)
    const svBasis = jb.times(
      gesetzlichKrankenversichert
        ? this.KV_BASISANTEIL.plus(this.PV_BASISANTEIL)
            .plus(this.RV_ANTEIL)
            .plus(this.AV_ANTEIL)
        : this.RV_ANTEIL.plus(this.AV_ANTEIL),
    );

    // Schritt 4: Sonderausgaben
    const sonderausgaben = this.SONDERAUSGABEN_PAUSCHBETRAG;

    // Schritt 5: Kinderfreibetrag (§ 32 Abs. 6 EStG)
    const kinderfreibetragBetrag =
      this.KINDERFREIBETRAG_JE_KIND.times(kinderfreibetrag);

    // Schritt 6: Zu versteuerndes Einkommen (zvE)
    let zve = jb
      .minus(werbungskosten)
      .minus(svBasis)
      .minus(sonderausgaben)
      .minus(kinderfreibetragBetrag);

    // Steuerklassenspezifische Freibeträge
    if (steuerklasse === 2) {
      zve = zve.minus(new Decimal('1908')); // Entlastungsbetrag Alleinerziehende
    }
    if (steuerklasse === 3) {
      // Doppelter Grundfreibetrag für SK3
      zve = zve.minus(this.GRUNDFREIBETRAG);
    }

    zve = Decimal.max(zve, new Decimal(0));

    // Schritt 7: Lohnsteuer nach Grundtabelle (§ 32a EStG)
    const lstJahr = this.grundtabelle(zve, steuerklasse);

    // Schritt 8: Monatliche LSt
    const lstMonat = lstJahr.dividedBy(12).toDecimalPlaces(0, Decimal.ROUND_DOWN);

    // Schritt 9: Solidaritätszuschlag
    const soli = this.berechneSoli(lstJahr);
    const soliMonat = soli.dividedBy(12).toDecimalPlaces(0, Decimal.ROUND_DOWN);

    return {
      lohnsteuerMonatCents: BigInt(lstMonat.toFixed(0)),
      soliMonatCents: BigInt(soliMonat.toFixed(0)),
    };
  }

  /**
   * Einkommensteuertarif § 32a EStG 2025 (Grundtabelle)
   * SK3 nutzt Splittingverfahren (halber zvE × 2).
   */
  private grundtabelle(zve: Decimal, steuerklasse: Steuerklasse): Decimal {
    if (steuerklasse === 3) {
      // Splitting: halber zvE berechnen, verdoppeln
      return this.tarif(zve.dividedBy(2)).times(2);
    }
    return this.tarif(zve);
  }

  private tarif(y: Decimal): Decimal {
    // Grundfreibetrag: unter 11.784 € = 0
    if (y.lte(this.GRUNDFREIBETRAG)) return new Decimal(0);

    const z2 = this.ZONE2_GRENZE;   // 17.005
    const z3 = this.ZONE3_GRENZE;   // 66.761
    const z4 = this.ZONE4_GRENZE;   // 277.826

    if (y.lte(z2)) {
      // Progressionszone 1: (979,18 × x + 1.400) × x
      const x = y.minus(this.GRUNDFREIBETRAG).dividedBy(10000);
      return new Decimal('979.18').times(x).plus(new Decimal('1400')).times(x);
    }

    if (y.lte(z3)) {
      // Progressionszone 2: (192,59 × x + 2.397) × x + 966,53
      const x = y.minus(z2).dividedBy(10000);
      return new Decimal('192.59').times(x).plus(new Decimal('2397')).times(x).plus(new Decimal('966.53'));
    }

    if (y.lte(z4)) {
      // Proportionalzone 1: 0,42 × zvE - 9.972,98
      return new Decimal('0.42').times(y).minus(new Decimal('9972.98'));
    }

    // Proportionalzone 2: 0,45 × zvE - 18.307,73
    return new Decimal('0.45').times(y).minus(new Decimal('18307.73'));
  }

  private berechneSoli(lstJahr: Decimal): Decimal {
    if (lstJahr.lte(this.SOLI_FREIGRENZE_LST)) return new Decimal(0);

    // Milderungszone: 11.9 % auf LSt über Freigrenze, max 5.5 %
    const milderung = lstJahr.minus(this.SOLI_FREIGRENZE_LST).times(new Decimal('0.119'));
    const normal = lstJahr.times(this.SOLI_SATZ);
    return Decimal.min(milderung, normal).toDecimalPlaces(0, Decimal.ROUND_DOWN);
  }
}

export function getLohnsteuerEngine(year: number): LohnsteuerEngine2025 {
  if (year === 2025) return new LohnsteuerEngine2025();
  // New engine per year; default to 2025 for now
  return new LohnsteuerEngine2025();
}
