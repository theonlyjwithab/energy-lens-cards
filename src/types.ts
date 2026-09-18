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

export type Period = 'day' | 'week' | 'month' | 'year';

export interface SolarGenerationCardConfig {
  type: string;
  title?: string;
  /** @deprecated Alte Einzel-Entität – wird automatisch nach `entity_1` migriert. */
  entity?: string;
  /** Bis zu 5 feste Entitäts-Slots, zwischen denen per Tabs gewechselt werden kann. */
  entity_1?: string;
  name_1?: string;
  /** Vorhersagelinie für diese Entität zeigen. Fehlt der Wert, gilt `forecast` (Standard: an). */
  forecast_1?: boolean;
  /** Kostenanzeige für diese Entität. Fehlt der Wert, gilt `show_cost` (Standard: an). */
  show_cost_1?: boolean;
  entity_2?: string;
  name_2?: string;
  forecast_2?: boolean;
  show_cost_2?: boolean;
  entity_3?: string;
  name_3?: string;
  forecast_3?: boolean;
  show_cost_3?: boolean;
  entity_4?: string;
  name_4?: string;
  forecast_4?: boolean;
  show_cost_4?: boolean;
  entity_5?: string;
  name_5?: string;
  forecast_5?: boolean;
  show_cost_5?: boolean;
  /** Zeitraum, mit dem die Karte beim Laden startet. Standard: 'day'. */
  default_period?: Period;
  /** Welche Zeiträume im Dropdown wählbar sind. Standard: alle vier. */
  periods?: Period[];
  /** Fallback für Entitäten ohne eigenes forecast_N-Feld. Standard: an. */
  forecast?: boolean;
  /** CSS-Farbe für die Balken, z. B. "#03a9f4" oder "orange". */
  bar_color?: string;
  /** Diagrammhöhe in Pixel. */
  height?: number;
  /** Strompreis in €/kWh, für eine Kostenanzeige neben der Summe. */
  price_per_kwh?: number;
  /** Kostenanzeige an/aus (nur relevant, wenn price_per_kwh gesetzt ist). Standard: an. */
  show_cost?: boolean;
}

export interface EnergyFlowCardConfig {
  type: string;
  title?: string;
  /** PV-Erzeugung gesamt (kWh, total_increasing). */
  pv_entity: string;
  /** In die Batterie geladene Energie (kWh). */
  battery_charge_entity: string;
  /** Aus der Batterie entladene Energie (kWh). */
  battery_discharge_entity: string;
  /** Aus dem Netz bezogene Energie (kWh). */
  grid_import_entity: string;
  /** Ins Netz eingespeiste Energie (kWh). */
  grid_export_entity: string;
  /** Zeitraum, mit dem die Karte beim Laden startet. Standard: 'day'. */
  default_period?: Period;
  /** Welche Zeiträume im Dropdown wählbar sind. Standard: alle vier. */
  periods?: Period[];
  /** Strompreis in €/kWh. Wenn gesetzt, erscheint ein zweiter Tab "Kosten". */
  price_per_kwh?: number;
}
