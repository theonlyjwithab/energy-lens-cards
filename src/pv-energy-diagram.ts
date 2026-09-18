import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, PvEnergyDiagramConfig, Period } from './types';
import { fetchStatistics, type StatBar } from './data/statistics';
import { fetchSolarForecast, alignForecastToBars } from './data/forecast';
import { getRangeForPeriod, shiftReferenceDate, RECORDER_PERIOD } from './utils/period';
import { formatBarLabels, formatBarTooltipLabel } from './utils/format';
import { renderChart } from './chart/bar-chart';
import type { DateRange } from './utils/time';
import { migrateConfig, getEntitySlots, type EntitySlot } from './utils/entities';
import { renderPeriodHeader, periodHeaderStyles, ALL_PERIODS } from './components/period-header';
import './pv-energy-diagram-editor';

@customElement('pv-energy-diagram')
export class PvEnergyDiagram extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: PvEnergyDiagramConfig;
  @state() private _period: Period = 'day';
  @state() private _referenceDate: Date = new Date();
  @state() private _bars: StatBar[] = [];
  @state() private _forecast: Array<number | null> = [];
  @state() private _loading = false;
  @state() private _error?: string;
  @state() private _hoveredIndex: number | null = null;
  @state() private _selectedEntityIndex = 0;

  private _fetchKey?: string;

  public setConfig(config: PvEnergyDiagramConfig): void {
    const migrated = migrateConfig(config);
    if (getEntitySlots(migrated).length === 0) {
      throw new Error('Bitte mindestens eine Entität in der Kartenkonfiguration angeben (entity_1).');
    }
    // Der Standard-Zeitraum soll nur beim allerersten Laden der Karte gelten,
    // nicht bei jeder späteren Config-Änderung (z. B. während man im Editor
    // die Balkenfarbe anpasst) den aktuell navigierten Zeitraum zurücksetzen.
    if (!this._config) {
      this._period = migrated.default_period ?? 'day';
    }
    this._config = migrated;
  }

  public getCardSize(): number {
    return 4;
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement('pv-energy-diagram-editor');
  }

  public static getStubConfig(_hass: HomeAssistant, entities: string[]): PvEnergyDiagramConfig {
    const entity = entities.find((entityId) => entityId.startsWith('sensor.')) ?? '';
    return {
      type: 'custom:pv-energy-diagram',
      entity_1: entity,
      title: 'Solar',
    };
  }

  private get _availablePeriods(): Period[] {
    return this._config?.periods?.length ? this._config.periods : ALL_PERIODS;
  }

  private get _entitySlots(): EntitySlot[] {
    return this._config ? getEntitySlots(this._config) : [];
  }

  private get _currentEntity(): EntitySlot | undefined {
    return this._entitySlots[this._selectedEntityIndex] ?? this._entitySlots[0];
  }

  private _selectEntity(index: number): void {
    this._selectedEntityIndex = index;
  }

  protected willUpdate(): void {
    if (!this.hass || !this._config) {
      return;
    }

    if (!this._availablePeriods.includes(this._period)) {
      this._period = this._availablePeriods[0];
    }
    if (this._selectedEntityIndex >= this._entitySlots.length) {
      this._selectedEntityIndex = 0;
    }

    const currentEntity = this._currentEntity;
    if (!currentEntity) {
      return;
    }

    const timeZone = this.hass.config.time_zone;
    const range = getRangeForPeriod(this._period, this._referenceDate, timeZone);
    const key = `${currentEntity.entity}|${this._period}|${range.start.getTime()}|${currentEntity.forecast}`;

    if (key !== this._fetchKey) {
      this._fetchKey = key;
      void this._fetchData(key, range, currentEntity.entity, currentEntity.forecast);
    }
  }

  /** Prognosedaten gibt es nur für "jetzt" – nicht parametrierbar nach Datum. */
  private _shouldFetchForecast(range: DateRange, timeZone: string, entityForecast: boolean): boolean {
    if (!entityForecast || this._period !== 'day') {
      return false;
    }
    const todayRange = getRangeForPeriod('day', new Date(), timeZone);
    return range.start.getTime() === todayRange.start.getTime();
  }

  private async _fetchData(key: string, range: DateRange, entityId: string, entityForecast: boolean): Promise<void> {
    if (!this.hass || !this._config) {
      return;
    }

    this._loading = true;
    this._error = undefined;
    this._hoveredIndex = null;

    try {
      const bars = await fetchStatistics(this.hass, entityId, range, RECORDER_PERIOD[this._period]);
      // Falls inzwischen weitergeklickt wurde, ist diese Antwort veraltet – verwerfen,
      // sonst könnte eine langsame ältere Antwort eine neuere überschreiben.
      if (key !== this._fetchKey) {
        return;
      }
      this._bars = bars;

      if (this._shouldFetchForecast(range, this.hass.config.time_zone, entityForecast)) {
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

  private _onPeriodChange(period: Period): void {
    this._period = period;
    this._referenceDate = new Date();
  }

  protected render() {
    if (!this._config || !this.hass || !this._currentEntity) {
      return html``;
    }

    const timeZone = this.hass.config.time_zone;
    const locale = this.hass.locale.language;
    const barLabels = formatBarLabels(this._period, this._bars, locale, timeZone);
    const tooltipLabels = this._bars.map((bar) => formatBarTooltipLabel(this._period, bar, locale, timeZone));
    const showCost = this._currentEntity.showCost && this._config.price_per_kwh != null;
    const cost = showCost ? this._total * this._config.price_per_kwh! : null;
    const costFormat = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' });

    return html`
      <ha-card>
        ${renderPeriodHeader({
          period: this._period,
          referenceDate: this._referenceDate,
          availablePeriods: this._availablePeriods,
          timeZone,
          locale,
          onPrevious: this._goToPrevious,
          onNext: this._goToNext,
          onNow: this._goToNow,
          onPeriodChange: (period) => this._onPeriodChange(period),
        })}

        ${this._entitySlots.length > 1
          ? html`
              <div class="entity-tabs">
                ${this._entitySlots.map(
                  (slot, index) => html`
                    <button
                      class=${index === this._selectedEntityIndex ? 'entity-tab active' : 'entity-tab'}
                      @click=${() => this._selectEntity(index)}
                    >
                      ${slot.name || slot.entity}
                    </button>
                  `,
                )}
              </div>
            `
          : ''}

        ${this._config.title ? html`<div class="title">${this._config.title}</div>` : ''}
        <div class="total">
          ${this._total.toFixed(2)} kWh
          ${cost !== null ? html`<span class="cost">(${costFormat.format(cost)})</span>` : ''}
        </div>

        <div class="chart">
          ${this._error
            ? html`<div class="message error">Fehler: ${this._error}</div>`
            : this._loading && this._bars.length === 0
              ? html`<div class="message">Lade Daten…</div>`
              : html`
                  <div class=${this._loading ? 'chart-content loading' : 'chart-content'}>
                    ${renderChart(this._bars, {
                      labels: barLabels,
                      tooltipLabels,
                      forecast: this._forecast.length > 0 ? this._forecast : undefined,
                      barColor: this._config.bar_color,
                      height: this._config.height,
                      locale,
                      pricePerKwh: showCost ? this._config.price_per_kwh : undefined,
                      hoveredIndex: this._hoveredIndex,
                      onHover: (index) => {
                        this._hoveredIndex = index;
                      },
                    })}
                  </div>
                `}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    periodHeaderStyles,
    css`
    .entity-tabs {
      display: flex;
      gap: 4px;
      padding: 8px 16px 0;
      overflow-x: auto;
    }
    .entity-tab {
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--secondary-text-color);
      cursor: pointer;
      font: inherit;
      font-size: 0.85rem;
      padding: 4px 8px;
      white-space: nowrap;
    }
    .entity-tab.active {
      border-bottom-color: var(--primary-color);
      color: var(--primary-text-color);
      font-weight: 500;
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
    .cost {
      font-size: 1rem;
      color: var(--secondary-text-color);
      font-weight: 400;
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
    .y-axis-col {
      display: flex;
      flex-direction: column;
      font-size: 0.7rem;
      color: var(--secondary-text-color);
      text-align: right;
      white-space: nowrap;
    }
    .y-axis-unit {
      margin-bottom: 2px;
    }
    .y-axis {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
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
    .gridlines {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .gridline {
      position: absolute;
      left: 0;
      right: 0;
      height: 1px;
      background: var(--divider-color);
      opacity: 0.5;
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
      position: relative;
      flex: 1;
      display: flex;
      align-items: flex-end;
      height: 100%;
      cursor: pointer;
    }
    .bar {
      width: 100%;
      border-radius: 2px 2px 0 0;
      min-height: 1px;
    }
    .tooltip {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      background: var(--card-background-color, #1c1c1c);
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      padding: 8px 10px;
      font-size: 0.75rem;
      color: var(--primary-text-color);
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    }
    .tooltip-title {
      font-weight: 500;
      margin-bottom: 4px;
    }
    .tooltip-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tooltip-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--primary-color);
    }
    .tooltip-dot.forecast {
      background: var(--primary-text-color);
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
  `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'pv-energy-diagram': PvEnergyDiagram;
  }
}
