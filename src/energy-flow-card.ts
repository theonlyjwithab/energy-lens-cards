import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, EnergyFlowCardConfig, Period } from './types';
import { fetchStatistics, type StatBar } from './data/statistics';
import { getRangeForPeriod, shiftReferenceDate, RECORDER_PERIOD } from './utils/period';
import type { DateRange } from './utils/time';
import { renderPeriodHeader, periodHeaderStyles, ALL_PERIODS } from './components/period-header';
import { renderEnergyFlowContent, ENERGY_FLOW_VIEW_WIDTH, ENERGY_FLOW_VIEW_HEIGHT, type EnergyFlowTotals } from './chart/energy-flow';
import './energy-flow-card-editor';

const REQUIRED_ENTITY_FIELDS = [
  'pv_entity',
  'battery_charge_entity',
  'battery_discharge_entity',
  'grid_import_entity',
  'grid_export_entity',
] as const;

type FlowTotals = EnergyFlowTotals;

function sum(bars: StatBar[]): number {
  return bars.reduce((total, bar) => total + bar.value, 0);
}

@customElement('energy-flow-card')
export class EnergyFlowCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EnergyFlowCardConfig;
  @state() private _period: Period = 'day';
  @state() private _referenceDate: Date = new Date();
  @state() private _totals?: FlowTotals;
  @state() private _loading = false;
  @state() private _error?: string;
  @state() private _view: 'flow' | 'cost' = 'flow';

  private _fetchKey?: string;

  public setConfig(config: EnergyFlowCardConfig): void {
    const missing = REQUIRED_ENTITY_FIELDS.filter((key) => !config[key]);
    if (missing.length > 0) {
      throw new Error(`Bitte folgende Entitäten in der Kartenkonfiguration angeben: ${missing.join(', ')}.`);
    }
    // Der Standard-Zeitraum soll nur beim allerersten Laden der Karte gelten,
    // nicht bei jeder späteren Config-Änderung den navigierten Zeitraum zurücksetzen.
    if (!this._config) {
      this._period = config.default_period ?? 'day';
    }
    this._config = config;
  }

  public getCardSize(): number {
    // Hochformat-Diagramm ist deutlich höher als die Balken-Karte.
    return 9;
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement('energy-flow-card-editor');
  }

  public static getStubConfig(): EnergyFlowCardConfig {
    // Anders als bei der Solar-Karte lässt sich hier keine passende Entität
    // automatisch erraten – es braucht 5 spezifische Sensoren (PV/Batterie/
    // Netz), die sich nicht anhand des entity_id-Präfixes unterscheiden
    // lassen. Die Karte öffnet nach dem Hinzufügen direkt im Editor, wo der
    // Nutzer sie auswählt.
    return {
      type: 'custom:energy-flow-card',
      title: 'Energiefluss',
      pv_entity: '',
      battery_charge_entity: '',
      battery_discharge_entity: '',
      grid_import_entity: '',
      grid_export_entity: '',
    };
  }

  private get _availablePeriods(): Period[] {
    return this._config?.periods?.length ? this._config.periods : ALL_PERIODS;
  }

  protected willUpdate(): void {
    if (!this.hass || !this._config) {
      return;
    }

    if (!this._availablePeriods.includes(this._period)) {
      this._period = this._availablePeriods[0];
    }
    if (this._config.price_per_kwh == null && this._view === 'cost') {
      this._view = 'flow';
    }

    const timeZone = this.hass.config.time_zone;
    const range = getRangeForPeriod(this._period, this._referenceDate, timeZone);
    const key = [
      this._config.pv_entity,
      this._config.battery_charge_entity,
      this._config.battery_discharge_entity,
      this._config.grid_import_entity,
      this._config.grid_export_entity,
      this._period,
      range.start.getTime(),
    ].join('|');

    if (key !== this._fetchKey) {
      this._fetchKey = key;
      void this._fetchData(key, range);
    }
  }

  private async _fetchData(key: string, range: DateRange): Promise<void> {
    if (!this.hass || !this._config) {
      return;
    }

    this._loading = true;
    this._error = undefined;

    try {
      const recorderPeriod = RECORDER_PERIOD[this._period];
      const [pvBars, chargeBars, dischargeBars, importBars, exportBars] = await Promise.all([
        fetchStatistics(this.hass, this._config.pv_entity, range, recorderPeriod),
        fetchStatistics(this.hass, this._config.battery_charge_entity, range, recorderPeriod),
        fetchStatistics(this.hass, this._config.battery_discharge_entity, range, recorderPeriod),
        fetchStatistics(this.hass, this._config.grid_import_entity, range, recorderPeriod),
        fetchStatistics(this.hass, this._config.grid_export_entity, range, recorderPeriod),
      ]);

      // Falls inzwischen weitergeklickt wurde, ist diese Antwort veraltet.
      if (key !== this._fetchKey) {
        return;
      }

      const pv = sum(pvBars);
      const charge = sum(chargeBars);
      const discharge = sum(dischargeBars);
      const gridImport = sum(importBars);
      const gridExport = sum(exportBars);
      const pvDirect = Math.max(pv - charge - gridExport, 0);
      const hausbedarf = pvDirect + discharge + gridImport;

      this._totals = { pv, charge, discharge, gridImport, gridExport, pvDirect, hausbedarf };
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

  private _selectView(view: 'flow' | 'cost'): void {
    this._view = view;
  }

  protected render() {
    if (!this._config || !this.hass) {
      return html``;
    }

    const timeZone = this.hass.config.time_zone;
    const locale = this.hass.locale.language;
    const price = this._config.price_per_kwh;
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

        ${price != null
          ? html`
              <div class="view-tabs">
                <button
                  class=${this._view === 'flow' ? 'view-tab active' : 'view-tab'}
                  @click=${() => this._selectView('flow')}
                >
                  Energiefluss
                </button>
                <button
                  class=${this._view === 'cost' ? 'view-tab active' : 'view-tab'}
                  @click=${() => this._selectView('cost')}
                >
                  Kosten
                </button>
              </div>
            `
          : ''}

        <div class="title">${this._config.title ?? 'Energiefluss'}</div>

        ${this._error
          ? html`<div class="message error">Fehler: ${this._error}</div>`
          : this._loading && !this._totals
            ? html`<div class="message">Lade Daten…</div>`
            : this._totals
              ? this._view === 'cost' && price != null
                ? this._renderCostView(this._totals, price, costFormat)
                : html`
                    <div class="chart">
                      <svg
                        viewBox="0 0 ${ENERGY_FLOW_VIEW_WIDTH} ${ENERGY_FLOW_VIEW_HEIGHT}"
                        style="width: 100%; height: auto; display: block;"
                      >
                        ${renderEnergyFlowContent(this._totals, locale)}
                      </svg>
                    </div>
                  `
              : html``}
      </ha-card>
    `;
  }

  private _renderCostView(totals: FlowTotals, price: number, costFormat: Intl.NumberFormat) {
    const gridCost = totals.gridImport * price;
    const selfSupplied = totals.pvDirect + totals.discharge;
    const savings = selfSupplied * price;

    return html`
      <div class="stat-row">
        <div class="stat-tile">
          <div class="stat-label">Kosten</div>
          <div class="stat-value">${costFormat.format(gridCost)}</div>
          <div class="stat-sub">Netzbezug ${totals.gridImport.toFixed(1)} kWh</div>
        </div>
        <div class="stat-tile">
          <div class="stat-label">Gespart</div>
          <div class="stat-value">${costFormat.format(savings)}</div>
          <div class="stat-sub">Eigenverbrauch ${selfSupplied.toFixed(1)} kWh</div>
        </div>
      </div>
    `;
  }

  static styles = [
    periodHeaderStyles,
    css`
      :host {
        /* Feste Farbzuordnung PV/Speicher/Netz – CVD-geprüfte Palette
           (siehe CLAUDE.md, Abschnitt "Zweite Karte: Energiefluss"). */
        --pv-color: #d95926;
        --speicher-color: #199e70;
        --netz-color: #3987e5;
        /* Modul-Kästchen etwas heller/dunkler als der Kartenhintergrund,
           analog zu Home Assistants eigenen Eingabefeldern/Listenzeilen. */
        --efc-surface-color: var(--secondary-background-color, #262626);
        --efc-track-color: var(--card-background-color, #1c1c1c);
      }
      .view-tabs {
        display: flex;
        gap: 4px;
        padding: 8px 16px 0;
      }
      .view-tab {
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        color: var(--secondary-text-color);
        cursor: pointer;
        font: inherit;
        font-size: 0.85rem;
        padding: 4px 8px;
      }
      .view-tab.active {
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
      .chart {
        padding: 8px 16px 16px;
      }
      .stat-row {
        display: flex;
        gap: 12px;
        padding: 12px 16px 16px;
      }
      .stat-tile {
        flex: 1;
        background: var(--efc-surface-color);
        border-radius: 8px;
        padding: 12px 14px;
      }
      .stat-label {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
        margin-bottom: 4px;
      }
      .stat-value {
        font-size: 1.4rem;
        font-weight: 700;
        color: var(--primary-text-color);
      }
      .stat-sub {
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        margin-top: 2px;
      }
      .message {
        padding: 16px 0;
        color: var(--secondary-text-color);
      }
      .message.error {
        color: var(--error-color);
      }
      .efc-label {
        font-size: 13px;
        fill: var(--primary-text-color);
        font-weight: 500;
      }
      .efc-value {
        font-size: 11.5px;
        fill: var(--secondary-text-color);
      }
      .efc-mini-name,
      .efc-mini-value {
        font-size: 9.5px;
        fill: var(--secondary-text-color);
      }
      .efc-ring-value {
        font-size: 17px;
        font-weight: 700;
        fill: var(--primary-text-color);
      }
      .efc-ring-label {
        font-size: 10.5px;
        fill: var(--secondary-text-color);
      }
      .efc-legend-text {
        font-size: 12px;
        fill: var(--secondary-text-color);
      }
      .efc-legend-value {
        font-size: 12px;
        fill: var(--primary-text-color);
        font-weight: 500;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'energy-flow-card': EnergyFlowCard;
  }
}
