import { html, svg, type TemplateResult } from 'lit';
import type { StatBar } from '../data/statistics';

export const DEFAULT_CHART_HEIGHT = 150;

export interface BarChartOptions {
  height?: number;
  barColor?: string;
  /** Eine Beschriftung pro Balken; leerer String blendet die Beschriftung an der Stelle aus. */
  labels?: string[];
  /** Prognosewert (kWh) je Balken, `null` wenn für diese Stunde keine Prognose vorliegt. */
  forecast?: Array<number | null>;
}

/**
 * Baut den `d`-Pfad für die gestrichelte Prognoselinie in einem 0–100
 * Prozent-Koordinatensystem (passend zum `viewBox="0 0 100 100"` des
 * Overlays). `null`-Werte unterbrechen die Linie (neuer Pfadabschnitt).
 */
function buildForecastPath(forecast: Array<number | null>, maxValue: number, barCount: number): string {
  let path = '';
  let penDown = false;

  forecast.forEach((value, index) => {
    if (value === null) {
      penDown = false;
      return;
    }
    const x = ((index + 0.5) / barCount) * 100;
    const y = 100 - (value / maxValue) * 100;
    path += `${penDown ? 'L' : 'M'} ${x} ${y} `;
    penDown = true;
  });

  return path.trim();
}

/**
 * Rendert Balken + Achsen als reines HTML/CSS (Flexbox) statt SVG. Grund:
 * Text in SVG würde durch das nicht-uniforme Strecken des Diagramms auf die
 * volle Kartenbreite verzerrt dargestellt. Die Balken selbst sind einfache
 * Rechtecke – dafür reicht Flexbox mit prozentualer Höhe völlig aus. Die
 * Prognoselinie ist die Ausnahme: Sie ist nur eine Linie (kein Text), daher
 * verzerrt sie beim Strecken nicht und wird als SVG-Overlay gezeichnet.
 */
export function renderChart(bars: StatBar[], options: BarChartOptions = {}): TemplateResult {
  const height = options.height ?? DEFAULT_CHART_HEIGHT;
  const barColor = options.barColor ?? 'var(--primary-color)';
  const labels = options.labels ?? bars.map(() => '');
  const forecast = options.forecast;

  const maxActual = Math.max(...bars.map((bar) => bar.value), 0.001);
  const maxForecast = forecast ? Math.max(...forecast.filter((v): v is number => v !== null), 0) : 0;
  const maxValue = Math.max(maxActual, maxForecast, 0.001);

  return html`
    <div class="chart-row">
      <div class="y-axis" style="height: ${height}px;">
        <span>${maxValue.toFixed(1)} kWh</span>
        <span>0 kWh</span>
      </div>
      <div class="plot-area">
        <div class="bars" style="height: ${height}px;">
          ${bars.map((bar) => {
            const pct = bar.value > 0 ? Math.max((bar.value / maxValue) * 100, 2) : 0;
            return html`
              <div class="bar-col">
                <div class="bar" style="height: ${pct}%; background: ${barColor};"></div>
              </div>
            `;
          })}
          ${forecast && bars.length > 0
            ? html`
                <svg class="forecast-line" viewBox="0 0 100 100" preserveAspectRatio="none">
                  ${svg`<path
                    d=${buildForecastPath(forecast, maxValue, bars.length)}
                    fill="none"
                    stroke="var(--primary-text-color)"
                    stroke-width="1.5"
                    stroke-dasharray="4 3"
                    vector-effect="non-scaling-stroke"
                  />`}
                </svg>
              `
            : ''}
        </div>
        <div class="x-axis">${labels.map((label) => html`<div class="x-label">${label}</div>`)}</div>
      </div>
    </div>
  `;
}
