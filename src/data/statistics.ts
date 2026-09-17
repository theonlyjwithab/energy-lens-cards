import type { HomeAssistant } from '../types';
import type { DateRange } from '../utils/time';

// Antwortformat von `recorder/statistics_during_period` bei types: ['change'].
// Pro Statistik-ID ein Array von Zeitfenstern mit dem jeweiligen Zuwachs.
interface StatisticsDuringPeriodEntry {
  start: number; // Unix-Zeitstempel in ms
  end: number;
  change: number | null;
}

type StatisticsDuringPeriodResult = Record<string, StatisticsDuringPeriodEntry[]>;

/** Bucket-Größe, in der der Recorder die Werte zusammenfasst. */
export type RecorderPeriod = 'hour' | 'day' | 'month';

export interface StatBar {
  start: Date;
  end: Date;
  value: number; // kWh in diesem Zeitfenster
}

/**
 * Holt Erzeugungswerte (kWh je Bucket) für eine Entität im angegebenen
 * Zeitraum über die Recorder-Websocket-API. `recorderPeriod` bestimmt die
 * Bucket-Größe (Stunde/Tag/Monat) je nach gewählter Ansicht.
 */
export async function fetchStatistics(
  hass: HomeAssistant,
  entityId: string,
  range: DateRange,
  recorderPeriod: RecorderPeriod,
): Promise<StatBar[]> {
  const result = await hass.callWS<StatisticsDuringPeriodResult>({
    type: 'recorder/statistics_during_period',
    start_time: range.start.toISOString(),
    end_time: range.end.toISOString(),
    statistic_ids: [entityId],
    period: recorderPeriod,
    types: ['change'],
  });

  const entries = result[entityId] ?? [];

  return entries.map((entry) => ({
    start: new Date(entry.start),
    end: new Date(entry.end),
    value: entry.change ?? 0,
  }));
}
