import { svg, type SVGTemplateResult } from 'lit';

export interface EnergyFlowTotals {
  pv: number;
  charge: number;
  discharge: number;
  gridImport: number;
  gridExport: number;
  /** Berechnet: PV − Laden − Einspeisung, auf 0 begrenzt. */
  pvDirect: number;
  /** Berechnet: PV-Direktverbrauch + Entladen + Netzbezug. */
  hausbedarf: number;
}

export const ENERGY_FLOW_VIEW_WIDTH = 320;
export const ENERGY_FLOW_VIEW_HEIGHT = 620;

const RING_RADIUS = 62;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const MIN_STROKE = 4;
const MAX_STROKE = 20;

function strokeWidthFor(value: number, maxValue: number): number {
  if (maxValue <= 0) {
    return MIN_STROKE;
  }
  return MIN_STROKE + (Math.max(value, 0) / maxValue) * (MAX_STROKE - MIN_STROKE);
}

function formatKwh(value: number, locale: string): string {
  const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
  return `${number} kWh`;
}

/**
 * Liefert nur den *Inhalt* des Diagramms (Pfade, Kästchen, Ring, Legende),
 * kein eigenes <svg>-Element – das steht wie bei bar-chart.ts direkt im
 * html-Template der Karte (siehe dortige Begründung: Lits `svg`-Tag ist nur
 * für Inhalte innerhalb eines bestehenden <svg>, nicht um es selbst zu
 * erzeugen).
 *
 * Layout-Koordinaten sind bewusst fest (kein responsives Neuberechnen) –
 * das ganze SVG wird über sein `viewBox` gleichmäßig skaliert, siehe Karte.
 */
export function renderEnergyFlowContent(totals: EnergyFlowTotals, locale: string): SVGTemplateResult {
  const { pv, charge, discharge, gridImport, gridExport, pvDirect, hausbedarf } = totals;

  const maxFlow = Math.max(pvDirect, charge, gridExport, discharge, gridImport, 0.001);
  const wDirect = strokeWidthFor(pvDirect, maxFlow);
  const wCharge = strokeWidthFor(charge, maxFlow);
  const wExport = strokeWidthFor(gridExport, maxFlow);
  const wDischarge = strokeWidthFor(discharge, maxFlow);
  const wImport = strokeWidthFor(gridImport, maxFlow);

  const total = Math.max(hausbedarf, 0.001);
  const pctDirect = (pvDirect / total) * 100;
  const pctDischarge = (discharge / total) * 100;
  const pctImport = (gridImport / total) * 100;

  const segDirect = (pctDirect / 100) * RING_CIRCUMFERENCE;
  const segDischarge = (pctDischarge / 100) * RING_CIRCUMFERENCE;
  const segImport = (pctImport / 100) * RING_CIRCUMFERENCE;

  return svg`
    <path d="M85,112 C85,155 82.5,165 82.5,214" fill="none" stroke="var(--pv-color)" stroke-width=${wCharge} opacity="0.88" stroke-linecap="round" />
    <path d="M160,112 C160,215 160,278 160,322" fill="none" stroke="var(--pv-color)" stroke-width=${wDirect} opacity="0.88" stroke-linecap="round" />
    <path d="M235,112 C235,155 237.5,165 237.5,214" fill="none" stroke="var(--pv-color)" stroke-width=${wExport} opacity="0.88" stroke-linecap="round" />
    <path d="M82.5,242 C82.5,290 120,322 160,322" fill="none" stroke="var(--speicher-color)" stroke-width=${wDischarge} opacity="0.9" stroke-linecap="round" />
    <path d="M237.5,242 C237.5,290 200,322 160,322" fill="none" stroke="var(--netz-color)" stroke-width=${wImport} opacity="0.9" stroke-linecap="round" />

    <rect x="20" y="20" width="280" height="100" rx="8" fill="var(--efc-surface-color)" />
    <text x="34" y="44">
      <tspan class="efc-label">PV</tspan>
      <tspan class="efc-value" dx="10">${formatKwh(pv, locale)} Erzeugung</tspan>
    </text>
    <text x="85" y="90" text-anchor="middle" class="efc-mini-name">geladen</text>
    <text x="85" y="104" text-anchor="middle" class="efc-mini-value">${formatKwh(charge, locale)}</text>
    <text x="160" y="90" text-anchor="middle" class="efc-mini-name">verbraucht</text>
    <text x="160" y="104" text-anchor="middle" class="efc-mini-value">${formatKwh(pvDirect, locale)}</text>
    <text x="235" y="90" text-anchor="middle" class="efc-mini-name">eingespeist</text>
    <text x="235" y="104" text-anchor="middle" class="efc-mini-value">${formatKwh(gridExport, locale)}</text>

    <rect x="20" y="200" width="125" height="56" rx="8" fill="var(--efc-surface-color)" />
    <text x="32" y="222" class="efc-label">Speicher</text>
    <text x="32" y="240" class="efc-value">entladen ${formatKwh(discharge, locale)}</text>

    <rect x="175" y="200" width="125" height="56" rx="8" fill="var(--efc-surface-color)" />
    <text x="187" y="222" class="efc-label">Netz</text>
    <text x="187" y="240" class="efc-value">bezogen ${formatKwh(gridImport, locale)}</text>

    <rect x="50" y="302" width="220" height="296" rx="8" fill="var(--efc-surface-color)" />
    <g transform="translate(160,384) rotate(-90)">
      <circle r=${RING_RADIUS} fill="none" stroke="var(--efc-track-color)" stroke-width="18" />
      <circle
        r=${RING_RADIUS}
        fill="none"
        stroke="var(--pv-color)"
        stroke-width="18"
        stroke-dasharray="${segDirect} ${RING_CIRCUMFERENCE}"
        stroke-dashoffset="0"
      />
      <circle
        r=${RING_RADIUS}
        fill="none"
        stroke="var(--speicher-color)"
        stroke-width="18"
        stroke-dasharray="${segDischarge} ${RING_CIRCUMFERENCE}"
        stroke-dashoffset="${-segDirect}"
      />
      <circle
        r=${RING_RADIUS}
        fill="none"
        stroke="var(--netz-color)"
        stroke-width="18"
        stroke-dasharray="${segImport} ${RING_CIRCUMFERENCE}"
        stroke-dashoffset="${-(segDirect + segDischarge)}"
      />
    </g>
    <text x="160" y="378" text-anchor="middle" class="efc-ring-value">${formatKwh(hausbedarf, locale)}</text>
    <text x="160" y="395" text-anchor="middle" class="efc-ring-label">Hausbedarf</text>

    <circle cx="76" cy="485" r="5" fill="var(--pv-color)" />
    <text x="88" y="489" class="efc-legend-text">PV-Direktverbrauch</text>
    <text x="244" y="489" text-anchor="end" class="efc-legend-value">${Math.round(pctDirect)}%</text>

    <circle cx="76" cy="513" r="5" fill="var(--speicher-color)" />
    <text x="88" y="517" class="efc-legend-text">aus Speicher</text>
    <text x="244" y="517" text-anchor="end" class="efc-legend-value">${Math.round(pctDischarge)}%</text>

    <circle cx="76" cy="541" r="5" fill="var(--netz-color)" />
    <text x="88" y="545" class="efc-legend-text">aus Netz</text>
    <text x="244" y="545" text-anchor="end" class="efc-legend-value">${Math.round(pctImport)}%</text>
  `;
}
