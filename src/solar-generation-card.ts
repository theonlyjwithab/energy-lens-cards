import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, SolarGenerationCardConfig } from './types';

@customElement('solar-generation-card')
export class SolarGenerationCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SolarGenerationCardConfig;

  public setConfig(config: SolarGenerationCardConfig): void {
    if (!config.entity) {
      throw new Error('Bitte eine Entität in der Kartenkonfiguration angeben (entity).');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 3;
  }

  protected render() {
    if (!this._config) {
      return html``;
    }

    return html`
      <ha-card>
        <div class="header">${this._config.title ?? 'Solar'}</div>
        <div class="content">Grundgerüst – Daten folgen im nächsten Schritt.</div>
      </ha-card>
    `;
  }

  static styles = css`
    .header {
      padding: 16px 16px 0;
      font-size: 1.2rem;
      font-weight: 500;
      color: var(--primary-text-color);
    }
    .content {
      padding: 16px;
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'solar-generation-card': SolarGenerationCard;
  }
}
