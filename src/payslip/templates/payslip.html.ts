import { PayrollEntry, Employee, TaxFeature } from '@prisma/client';

function formatCents(cents: bigint): string {
  const euros = Number(cents) / 100;
  return euros.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

export function renderPayslipHtml(params: {
  entry: PayrollEntry & { employee: Employee; taxFeature: TaxFeature };
  periodYear: number;
  periodMonth: number;
  companyName: string;
}): string {
  const { entry, periodYear, periodMonth, companyName } = params;
  const { employee: emp, taxFeature: tf } = entry;

  const monate = [
    '', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  ];

  const zeitraum = `${monate[periodMonth]} ${periodYear}`;
  const svAn =
    entry.kvAnCents + entry.pvAnCents + entry.rvAnCents + entry.avAnCents;
  const svAg =
    entry.kvAgCents + entry.pvAgCents + entry.rvAgCents + entry.avAgCents;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 20mm; color: #000; }
  h1 { font-size: 16px; margin-bottom: 4px; }
  h2 { font-size: 13px; border-bottom: 1px solid #000; padding-bottom: 3px; margin-top: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  td { padding: 3px 6px; }
  .label { width: 60%; }
  .amount { text-align: right; width: 20%; }
  .total { font-weight: bold; border-top: 2px solid #000; }
  .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .box { border: 1px solid #ccc; padding: 8px; }
</style>
</head>
<body>

<h1>Lohn-/Gehaltsabrechnung</h1>
<p><strong>Abrechnungszeitraum:</strong> ${zeitraum}</p>

<div class="header-grid">
  <div class="box">
    <strong>Arbeitgeber</strong><br/>
    ${companyName}
  </div>
  <div class="box">
    <strong>Arbeitnehmer</strong><br/>
    ${emp.vorname} ${emp.nachname}<br/>
    Steuerklasse: ${tf.steuerklasse}&nbsp;&nbsp;
    Kinderfreibetrag: ${tf.kinderfreibetrag.toString()}<br/>
    Kirchensteuer: ${tf.kirchensteuerMerkmal ?? 'keine'}
  </div>
</div>

<h2>Bezüge (Brutto)</h2>
<table>
  <tr><td class="label">Bruttoarbeitsentgelt</td><td class="amount">${formatCents(entry.bruttoEntgeltCents)}</td></tr>
</table>

<h2>Steuern &amp; Abgaben (Arbeitnehmer)</h2>
<table>
  <tr><td class="label">Lohnsteuer</td><td class="amount">- ${formatCents(entry.lohnsteuerCents)}</td></tr>
  <tr><td class="label">Solidaritätszuschlag</td><td class="amount">- ${formatCents(entry.soliCents)}</td></tr>
  <tr><td class="label">Kirchensteuer</td><td class="amount">- ${formatCents(entry.kirchensteuerCents)}</td></tr>
  <tr><td class="label">Krankenversicherung AN</td><td class="amount">- ${formatCents(entry.kvAnCents)}</td></tr>
  <tr><td class="label">Pflegeversicherung AN</td><td class="amount">- ${formatCents(entry.pvAnCents)}</td></tr>
  <tr><td class="label">Rentenversicherung AN</td><td class="amount">- ${formatCents(entry.rvAnCents)}</td></tr>
  <tr><td class="label">Arbeitslosenversicherung AN</td><td class="amount">- ${formatCents(entry.avAnCents)}</td></tr>
  <tr class="total">
    <td class="label">Gesamt Abzüge AN</td>
    <td class="amount">- ${formatCents(entry.lohnsteuerCents + entry.soliCents + entry.kirchensteuerCents + svAn)}</td>
  </tr>
</table>

<h2>Auszahlungsbetrag</h2>
<table>
  <tr class="total">
    <td class="label">Nettoentgelt</td>
    <td class="amount">${formatCents(entry.nettoEntgeltCents)}</td>
  </tr>
</table>

<h2>Arbeitgeberanteile Sozialversicherung</h2>
<table>
  <tr><td class="label">KV AG</td><td class="amount">${formatCents(entry.kvAgCents)}</td></tr>
  <tr><td class="label">PV AG</td><td class="amount">${formatCents(entry.pvAgCents)}</td></tr>
  <tr><td class="label">RV AG</td><td class="amount">${formatCents(entry.rvAgCents)}</td></tr>
  <tr><td class="label">AV AG</td><td class="amount">${formatCents(entry.avAgCents)}</td></tr>
  <tr class="total"><td class="label">Gesamt AG-Anteil SV</td><td class="amount">${formatCents(svAg)}</td></tr>
</table>

<h2>Kumulierte Jahreswerte</h2>
<table>
  <tr><td class="label">Jahresbrutto bisher</td><td class="amount">${formatCents(entry.ytdBruttoCents)}</td></tr>
  <tr><td class="label">Jahreslohnsteuer bisher</td><td class="amount">${formatCents(entry.ytdLohnsteuerCents)}</td></tr>
</table>

</body>
</html>`;
}
