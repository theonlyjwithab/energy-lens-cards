import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, SolarGenerationCardConfig, Period } from './types';
import { fetchStatistics, type StatBar } from './data/statistics';
import { fetchSolarForecast, alignForecastToBars } from './data/forecast';
import { getRangeForPeriod, shiftReferenceDate, RECORDER_PERIOD } from './utils/period';
import { formatRangeLabel, formatBarLabels } from './utils/format';
import { renderChart } from './chart/bar-chart';
import type { DateRange } from './utils/time';

const PERIOD_LABELS: Record<Period, string> = {
  day: 'Tag',
  week: 'Woche',
  month: 'Monat',
  year: 'Jahr',
};

@customElement('solar-generation-card')
export class SolarGenerationCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SolarGenerationCardConfig;
  @state() private _period: Period = 'day';
  @state() private _referenceDate: Date = new Date();
  @state() private _bars: StatBar[] = [];
  @state() private _forecast: Array<number | null> = [];
  @state() private _loading = false;
  @state() private _error?: string;

  private _fetchKey?: string;

  public setConfig(config: SolarGenerationCardConfig): void {
    if (!config.entity) {
      throw new Error('Bitte eine Entität in der Kartenkonfiguration angeben (entity).');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 4;
  }

  protected willUpdate(): void {
    if (!this.hass || !this._config) {
      return;
    }

    const timeZone = this.hass.config.time_zone;
    const range = getRangeForPeriod(this._period, this._referenceDate, timeZone);
    const key = `${this._config.entity}|${this._period}|${range.start.getTime()}|${this._config.forecast}`;

    if (key !== this._fetchKey) {
      this._fetchKey = key;
      void this._fetchData(key, range);
    }
  }

  /** Prognosedaten gibt es nur für "jetzt" – nicht parametrierbar nach Datum. */
  private _shouldFetchForecast(range: DateRange, timeZone: string): boolean {
    if (!this._config || this._config.forecast === false || this._period !== 'day') {
      return false;
    }
    const todayRange = getRangeForPeriod('day', new Date(), timeZone);
    return range.start.getTime() === todayRange.start.getTime();
  }

  private async _fetchData(key: string, range: DateRange): Promise<void> {
    if (!this.hass || !this._config) {
      return;
    }

    this._loading = true;
    this._error = undefined;

    try {
      const bars = await fetchStatistics(this.hass, this._config.entity, range, RECORDER_PERIOD[this._period]);
      // Falls inzwischen weitergeklickt wurde, ist diese Antwort veraltet – verwerfen,
      // sonst könnte eine langsame ältere Antwort eine neuere überschreiben.
      if (key !== this._fetchKey) {
        return;
      }
      this._bars = bars;

      if (this._shouldFetchForecast(range, this.hass.config.time_zone)) {
        try {
          const forecastPoints = await fetchSolarForecast(this.hass);
          if (key === this._fetchKey) {
            this._forecast = alignForecastToBars(bars, forecastPoints);
          }
        } catch {
          // Prognose ist optional – Fehler hier sollen nicht die eigentlichen
          // Erzeugungsdaten überdecken, einfach ohne Prognoselinie weitermachen.
          if (key === this._fetchKey) {
            this._forecast = [];
          }
        }
      } else {
        this._forecast = [];
      }
    } catch (err) {
      if (key !== this._fetchKey) {
        return;
      }
      this._error = err instanceof Error ? err.message : String(err);
    } finally {
      if (key === this._fetchKey) {
        this._loading = false;
      }
    }
  }

  private get _total(): number {
    return this._bars.reduce((sum, bar) => sum + bar.value, 0);
  }

  private _goToPrevious(): void {
    if (!this.hass) return;
    this._referenceDate = shiftReferenceDate(this._referenceDate, this._period, -1, this.hass.config.time_zone);
  }

  private _goToNext(): void {
    if (!this.hass) return;
    this._referenceDate = shiftReferenceDate(this._referenceDate, this._period, 1, this.hass.config.time_zone);
  }

  private _goToNow(): void {
    this._referenceDate = new Date();
  }

  private _onPeriodChange(ev: Event): void {
    this._period = (ev.target as HTMLSelectElement).value as Period;
    this._referenceDate = new Date();
  }

  protected render() {
    if (!this._config || !this.hass) {
      return html``;
    }

    const timeZone = this.hass.config.time_zone;
    const range = getRangeForPeriod(this._period, this._referenceDate, timeZone);
    const nowRange = getRangeForPeriod(this._period, new Date(), timeZone);
    const isCurrentPeriod = range.start.getTime() === nowRange.start.getTime();
    const label = formatRangeLabel(this._period, range, this.hass.locale.language, timeZone);
    const barLabels = formatBarLabels(this._period, this._bars, this.hass.locale.language, timeZone);

    return html`
      <ha-card>
        <div class="header">
          <div class="nav">
            <button class="icon-button" @click=${this._goToPrevious} aria-label="Zurück">‹</button>
            <button class="text-button" @click=${this._goToNow}>Jetzt</button>
            <button
              class="icon-button"
              @click=${this._goToNext}
              ?disabled=${isCurrentPeriod}
              aria-label="Vor"
            >
              ›
            </button>
          </div>
          <div class="date-label">${label}</div>
          <select class="period-select" .value=${this._period} @change=${this._onPeriodChange}>
            ${(Object.keys(PERIOD_LABELS) as Period[]).map(
              (period) => html`<option value=${period}>${PERIOD_LABELS[period]}</option>`,
            )}
          </select>
        </div>

        <div class="title">${this._config.title ?? 'Solar'}</div>
        <div class="total">${this._total.toFixed(2)} kWh</div>

        <div class="chart">
          ${this._error
            ? html`<div class="message error">Fehler: ${this._error}</div>`
            : this._loading && this._bars.length === 0
              ? html`<div class="message">Lade Daten…</div>`
              : html`
                  <div class=${this._loading ? 'chart-content loading' : 'chart-content'}>
                    ${renderChart(this._bars, {
                      labels: barLabels,
                      forecast: this._forecast.length > 0 ? this._forecast : undefined,
                    })}
                  </div>
                `}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px 0;
      color: var(--secondary-text-color);
      font-size: 0.9rem;
    }
    .nav {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .date-label {
      flex: 1;
      text-align: center;
    }
    .icon-button,
    .text-button {
      background: none;
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      color: var(--primary-text-color);
      cursor: pointer;
      padding: 2px 8px;
      font: inherit;
    }
    .icon-button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .period-select {
      background: var(--card-background-color, #1c1c1c);
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      color: var(--primary-text-color);
      font: inherit;
      padding: 2px 4px;
    }
    /* Die Dropdown-Liste eines <select> wird vom Browser nativ gerendert und
       ignoriert sonst unsere Kartenfarben (weißer Hintergrund + heller Text
       aus dem Dark Theme = unlesbar). Chromium erlaubt es, das per Styling
       auf <option> zu korrigieren. */
    .period-select option {
      background: var(--card-background-color, #1c1c1c);
      color: var(--primary-text-color);
    }
    .title {
      padding: 8px 16px 0;
      font-size: 1.2rem;
      font-weight: 500;
      color: var(--primary-text-color);
    }
    .total {
      padding: 4px 16px 8px;
      font-size: 1.5rem;
      font-weight: 400;
      color: var(--primary-text-color);
    }
    .chart {
      padding: 0 16px 16px;
    }
    .chart-content {
      transition: opacity 150ms ease;
    }
    .chart-content.loading {
      opacity: 0.4;
    }
    .chart-row {
      display: flex;
      gap: 8px;
    }
    .y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 0.7rem;
      color: var(--secondary-text-color);
      text-align: right;
      white-space: nowrap;
    }
    .plot-area {
      flex: 1;
      min-width: 0;
    }
    .bars {
      position: relative;
      display: flex;
      align-items: flex-end;
      gap: 4px;
      border-bottom: 1px solid var(--divider-color);
    }
    .forecast-line {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: visible;
    }
    .bar-col {
      flex: 1;
      display: flex;
      align-items: flex-end;
      height: 100%;
    }
    .bar {
      width: 100%;
      border-radius: 2px 2px 0 0;
      min-height: 1px;
    }
    .x-axis {
      display: flex;
      gap: 4px;
      margin-top: 4px;
    }
    .x-label {
      flex: 1;
      text-align: center;
      font-size: 0.7rem;
      color: var(--secondary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .message {
      padding: 16px 0;
      color: var(--secondary-text-color);
    }
    .message.error {
      color: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'solar-generation-card': SolarGenerationCard;
  }
}
