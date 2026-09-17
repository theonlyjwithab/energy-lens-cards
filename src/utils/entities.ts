import type { SolarGenerationCardConfig } from '../types';

export interface EntitySlot {
  entity: string;
  name?: string;
  /** Aufgelöst inkl. Fallback auf das globale `forecast`-Feld (Standard: an). */
  forecast: boolean;
  /** Aufgelöst inkl. Fallback auf das globale `show_cost`-Feld (Standard: an). */
  showCost: boolean;
}

/**
 * Wandelt eine alte Einzel-Entity-Config (`entity: "sensor.x"`) einmalig in
 * das neue Slot-Format um (`entity_1`), damit bestehende Karten nach dem
 * Update weiterlaufen, ohne dass man die YAML von Hand anpassen muss.
 *
 * Befüllt außerdem `forecast_N`/`show_cost_N` mit ihrem tatsächlichen
 * Standardwert, sobald die zugehörige Entität bzw. der Preis gesetzt ist.
 * Grund: Eine Checkbox mit Wert `undefined` zeigt sich im Editor als
 * "aus" an, obwohl unsere Logik `undefined` bisher als "an" (Standard)
 * behandelt hat – das sah für Nutzer wie ein Bug aus ("Haken ist weg, aber
 * Prognose wird trotzdem angezeigt"). Nach der Migration ist der Wert immer
 * explizit gesetzt, die Checkbox zeigt also den echten Zustand.
 */
export function migrateConfig(config: SolarGenerationCardConfig): SolarGenerationCardConfig {
  let migrated = config;
  if (migrated.entity && !migrated.entity_1) {
    migrated = { ...migrated, entity_1: migrated.entity };
  }

  const forecastDefault = migrated.forecast ?? true;
  const showCostDefault = migrated.show_cost ?? true;
  const hasPrice = migrated.price_per_kwh != null;
  const patch: Partial<SolarGenerationCardConfig> = {};

  if (migrated.entity_1) {
    if (migrated.forecast_1 === undefined) patch.forecast_1 = forecastDefault;
    if (hasPrice && migrated.show_cost_1 === undefined) patch.show_cost_1 = showCostDefault;
  }
  if (migrated.entity_2) {
    if (migrated.forecast_2 === undefined) patch.forecast_2 = forecastDefault;
    if (hasPrice && migrated.show_cost_2 === undefined) patch.show_cost_2 = showCostDefault;
  }
  if (migrated.entity_3) {
    if (migrated.forecast_3 === undefined) patch.forecast_3 = forecastDefault;
    if (hasPrice && migrated.show_cost_3 === undefined) patch.show_cost_3 = showCostDefault;
  }
  if (migrated.entity_4) {
    if (migrated.forecast_4 === undefined) patch.forecast_4 = forecastDefault;
    if (hasPrice && migrated.show_cost_4 === undefined) patch.show_cost_4 = showCostDefault;
  }
  if (migrated.entity_5) {
    if (migrated.forecast_5 === undefined) patch.forecast_5 = forecastDefault;
    if (hasPrice && migrated.show_cost_5 === undefined) patch.show_cost_5 = showCostDefault;
  }

  return Object.keys(patch).length > 0 ? { ...migrated, ...patch } : migrated;
}

/** Liefert die belegten Entitäts-Slots (leere Slots werden herausgefiltert). */
export function getEntitySlots(config: SolarGenerationCardConfig): EntitySlot[] {
  const slots: Array<{ entity: string; name?: string; forecastFlag?: boolean; showCostFlag?: boolean }> = [
    { entity: config.entity_1 ?? '', name: config.name_1, forecastFlag: config.forecast_1, showCostFlag: config.show_cost_1 },
    { entity: config.entity_2 ?? '', name: config.name_2, forecastFlag: config.forecast_2, showCostFlag: config.show_cost_2 },
    { entity: config.entity_3 ?? '', name: config.name_3, forecastFlag: config.forecast_3, showCostFlag: config.show_cost_3 },
    { entity: config.entity_4 ?? '', name: config.name_4, forecastFlag: config.forecast_4, showCostFlag: config.show_cost_4 },
    { entity: config.entity_5 ?? '', name: config.name_5, forecastFlag: config.forecast_5, showCostFlag: config.show_cost_5 },
  ];

  return slots
    .filter((slot) => slot.entity !== '')
    .map((slot) => ({
      entity: slot.entity,
      name: slot.name,
      forecast: slot.forecastFlag ?? config.forecast ?? true,
      showCost: slot.showCostFlag ?? config.show_cost ?? true,
    }));
}
