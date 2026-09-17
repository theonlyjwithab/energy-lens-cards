// Minimale Typen für den Start – wird in späteren Schritten erweitert
// (z. B. um Statistik- und Forecast-Antworttypen).

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  language: string;
  locale: {
    language: string;
    number_format: string;
    time_format: string;
  };
  config: {
    time_zone: string;
  };
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
}

export interface SolarGenerationCardConfig {
  type: string;
  title?: string;
  entity: string;
}
