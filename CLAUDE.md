# SolarCard

## Projektziel

Eigenständige Lovelace-Karte für Home Assistant, die die Solarerzeugung als Balkendiagramm
zeigt (Solaranlage: Anker Solix Pro 2). Optische Vorlage: Kopfzeile mit Datum und Navigation
(Jetzt / zurück / vor), darunter Titel mit Gesamtsumme in kWh, darunter Balkendiagramm mit
gestrichelter Prognoselinie.

Nutzer möchte selbst mitprogrammieren und lernen — deshalb in kleinen Schritten arbeiten,
Entscheidungen kurz erklären, vor jedem größeren Schritt Rückfragen stellen bei Unklarheiten,
und nach jedem Schritt kurz erklären, wie man in HA testet.

### Funktionsumfang (Ziel)

- Zeiträume: Tag (Balken/Stunde), Woche (Balken/Tag), Monat (Balken/Tag), Jahr (Balken/Monat)
- Navigation: zurück / vor / "Jetzt", Umschalten des Zeitraums (⋮-Menü)
- Titel + Gesamtsumme des gewählten Zeitraums
- Prognoselinie mind. in der Tagesansicht, abschaltbar
- Tooltips bei Antippen/Hovern der Balken
- HA-Theme-Variablen (hell/dunkel), responsiv
- Mehrere Karteninstanzen pro Ansicht, unabhängig voneinander
- Visueller Config-Editor (`getConfigElement`, kein YAML nötig): Titel, Entität, Standard-
  zeitraum, wählbare Zeiträume, Prognose an/aus (+ Auswahl Forecast.Solar-Eintrag), Balkenfarbe,
  optionale Diagrammhöhe, `getStubConfig()`, Registrierung über `window.customCards`

### Wichtige technische Vorgabe

**Nicht** die eingebaute `energy-date-selection` bzw. gemeinsame Energy-Collection verwenden
(synchronisiert sonst alle Energie-Karten einer Ansicht). Jede Karteninstanz holt ihre Daten
selbst und unabhängig:
- Messwerte: Websocket `recorder/statistics_during_period` (types: `["change"]`, passende
  `period` je Ansicht)
- Prognose: Websocket `energy/solar_forecast`
- Zeitzone/Locale aus der HA-Konfiguration übernehmen

## Abgestimmter Plan

1. **Grundgerüst** — Karte mit festem Titel, die in HA angezeigt wird ✅ erledigt
2. **Datenabfrage + Tagesansicht** — `recorder/statistics_during_period`, Stundenbalken ✅ erledigt
3. **Navigation + weitere Zeiträume** — Header mit Datum/Jetzt/Pfeile, Tag/Woche/Monat/Jahr ✅ erledigt
4. **Prognoselinie** — `energy/solar_forecast`, gestrichelt, ein-/ausschaltbar ✅ erledigt
5. **Visueller Editor** — `getConfigElement`, alle Config-Optionen ← nächster Schritt
6. **HACS/Release-Setup** — hacs.json verfeinern, GitHub Action (Tag `v*` → Build + Release),
   README auf Deutsch mit Installationsanleitung

## Getroffene Entscheidungen

- **Sprache/Framework:** TypeScript + Lit (Standard für HA-Custom-Cards, leichtgewichtig,
  Web-Components-basiert).
- **Chart-Rendering:** Eigenes Rendering statt fertiger Chart-Library (Chart.js/ECharts).
  Begründung: Balken + eine Linie ist geometrisch einfach genug, spart 40–200 KB, vermeidet
  Theming-Hakeligkeiten (Canvas vs. DOM/CSS-Variablen), und ist lehrreicher. Bei Bedarf später
  austauschbar (z. B. uPlot), da Datenschicht unabhängig vom Rendering ist.
  **Präzisierung nach Schritt 3:** Balken + Achsenbeschriftungen werden als HTML/CSS (Flexbox,
  prozentuale Höhe) gerendert, nicht als SVG. Grund: Das Diagramm wird nicht-uniform auf die
  volle Kartenbreite gestreckt (`preserveAspectRatio="none"` wäre nötig gewesen) — Text in
  SVG `<text>`-Elementen würde dabei mitgestreckt und verzerrt aussehen. Reines SVG bleibt für
  Schritt 4 vorgesehen (gestrichelte Prognoselinie), da Linien beim Strecken nicht verzerren.
- **Bundler:** Vite (Library-Mode), Output: eine Datei `dist/solar-cards.js` als ES-Modul,
  Lit eingebündelt (kein CDN zur Laufzeit).
- **Decorators:** `useDefineForClassFields: false` + `experimentalDecorators: true` in
  `tsconfig.json` — notwendig, damit Lits klassische Decorators (`@customElement`, `@state`,
  `@property`) korrekt funktionieren (bekannte Stolperfalle bei Lit + moderner TS-Config).
- **`setConfig()`** wirft einen Fehler, wenn keine `entity` gesetzt ist — üblicher HA-Mechanismus
  für eine verständliche Fehlermeldung in der UI statt stillem Bug.
- **Paketmanager:** npm (keine Zusatzinstallation nötig, funktioniert überall inkl. GitHub
  Actions ohne Extra-Setup).
- **Repo/Ordner:** Lokal unter `C:\Users\jonas\Documents\HomeAssistant\SolarCard` (bewusst
  getrennt vom KiCad/Firmware-Repo `StroboControl`). Git lokal initialisiert, noch kein
  GitHub-Remote — wird bei Bedarf später vom Nutzer angelegt/verknüpft.
- **Dev-Workflow:** `npm run start` = Vite-Watch-Build (`dist/solar-cards.js`) + lokaler
  Static-Server (`http-server`, Port 5000, CORS, kein Cache) parallel via `concurrently`. Karte
  wird in HA als Ressourcen-URL (`http://<PC-IP>:5000/solar-cards.js`, Typ „JavaScript-Modul“)
  eingebunden. Cache-Busting bisher manuell per Query-Parameter (`?v=`) oder Hard-Reload —
  saubere Lösung folgt mit Versionierung in Schritt 6.

## Aktueller Stand

**Erledigt (Schritt 1 — Grundgerüst):**
- Projektgerüst angelegt: `package.json`, `tsconfig.json`, `vite.config.ts`, ESLint (Flat
  Config) + Prettier, `.gitignore`, `hacs.json` (Minimalversion), `README.md` (Platzhalter)
- `src/types.ts` — minimale Typen (`HomeAssistant`, `HassEntity`, `SolarGenerationCardConfig`)
- `src/solar-generation-card.ts` — Lit-Komponente `<solar-generation-card>` mit `setConfig()`,
  `getCardSize()`, zeigt Titel + Platzhaltertext
- `src/register.ts` — `customElements`-Registrierung + `window.customCards`-Eintrag
- Build funktioniert (`npm run build` → `dist/solar-cards.js`, ~25 KB / 7,8 KB gzip), ESLint
  läuft fehlerfrei
- Git-Repo lokal initialisiert, erster Commit erstellt
- Als HA-Ressource eingebunden und erfolgreich getestet

**Erledigt (Schritt 2 — Datenabfrage + Tagesansicht):**
- `src/utils/time.ts` — `getZonedDayBounds()`: Start/Ende des aktuellen Kalendertags in einer
  IANA-Zeitzone (HA-Konfiguration statt Browser-Zeitzone berechnet), per `Intl.DateTimeFormat`-
  Offset-Trick, ohne Zusatzbibliothek, DST-sicher
- `src/data/statistics.ts` — `fetchStatistics()`: ruft `recorder/statistics_during_period` per
  `hass.callWS()` auf (`period` variabel: `hour`/`day`/`month`, `types: ['change']`) und liefert
  `StatBar[]` (`start`, `end`, `value` in kWh)
- `src/chart/bar-chart.ts` — `renderBars()`: reine Funktion, rendert `StatBar[]` als
  SVG-*Inhalt* (Balken + Grundlinie als Achse) — **wichtig:** liefert nur den Inhalt, nicht das
  `<svg>`-Element selbst (siehe Bugfix unten)
- `src/solar-generation-card.ts` — lädt beim ersten `hass`-Update bzw. bei Entity-Wechsel die
  heutigen Stundenwerte, zeigt Titel, Gesamtsumme (kWh) und Balkendiagramm bzw.
  Lade-/Fehlermeldung
- Daten werden aktuell nur einmalig pro Zeitraum-Wechsel geholt (kein Live-Refresh/Polling)
- Erfolgreich getestet mit `sensor.draussen_balkonkraftwerk_pv_erzeugung_taglich`: Titel,
  Tagessumme und ansteigende Stundenbalken werden korrekt angezeigt (nächtliche Nullwerte sind
  unsichtbare Balken mit Höhe 0 — kein Bug)
- **Bugfix während Schritt 2/3:** Das Diagramm wurde falsch skaliert dargestellt (nur eine „Ecke“
  sichtbar, keine erkennbare Achse). Ursache: `bar-chart.ts` hatte mit Lits `svg`-Tag ein
  komplettes `<svg>...</svg>`-Element erzeugt und dieses Ergebnis dann als Kind in das
  `html`-Template der Karte eingesetzt. Laut Lit-Doku ist der `svg`-Tag nur für Inhalte *innerhalb*
  eines bereits im `html`-Template stehenden `<svg>` gedacht, nicht um das `<svg>`-Element selbst
  zu erzeugen. Fix: Das `<svg>`-Element steht jetzt direkt im `html`-Template der Karte
  (`solar-generation-card.ts`), `bar-chart.ts` liefert nur noch den Inhalt (`renderBars()`) inkl.
  einer sichtbaren Grundlinie als Achse.

**Erledigt (Schritt 3 — Navigation + weitere Zeiträume):**
- `src/utils/time.ts` — erweitert um `getZonedWeekBounds()` (Mo–So), `getZonedMonthBounds()`,
  `getZonedYearBounds()` und `shiftZonedDate()` (Navigation zurück/vor, rechnet mit 12:00 Mittag
  als Referenzuhrzeit, um DST-Kanten zu vermeiden)
- `src/utils/period.ts` — verbindet `Period`-Typ mit Recorder-Bucket-Größe (`RECORDER_PERIOD`)
  und Zeitraumgrenzen (`getRangeForPeriod`, `shiftReferenceDate`)
- `src/utils/format.ts` — `formatRangeLabel()`: lokalisierte Anzeige des Zeitraums im Header
  (z. B. „17. September 2026“, „15.09. – 21.09.2026“, „September 2026“, „2026“)
- `src/types.ts` — `Period`-Typ (`'day' | 'week' | 'month' | 'year'`)
- `src/solar-generation-card.ts` — Header mit Datumsanzeige, „Jetzt“-Button, Pfeilen
  (zurück/vor), Zeitraum-Auswahl (aktuell als natives `<select>` statt ⋮-Menü — bewusste
  Vereinfachung, siehe Entscheidungen); „Vor“-Pfeil deaktiviert sich automatisch, wenn der
  aktuelle Zeitraum erreicht ist (keine Navigation in die Zukunft)
- Woche: Mo–So, Balken pro Tag; Monat: Balken pro Tag; Jahr: Balken pro Monat
- Standard-Zeitraum beim Laden: immer „Tag“ (Nutzerentscheidung; Konfigurierbarkeit kommt mit
  dem visuellen Editor in Schritt 5)
- Achsenbeschriftung + Chart-Rendering: siehe präzisierte Chart-Rendering-Entscheidung oben
  (HTML/CSS statt SVG für Balken/Achsen)
- **Fix Dropdown-Kontrast:** `<option>`-Elemente im Zeitraum-`<select>` bekommen explizit
  `background`/`color` gesetzt — sonst rendert der Browser die native Dropdown-Liste mit weißem
  Hintergrund, was zusammen mit hellem Dark-Theme-Text unlesbar war
- **Fix Ruckeln beim Blättern:** Bisher wurde das komplette Diagramm bei jedem Zeitraum-Wechsel
  kurz durch „Lade Daten…“ ersetzt, während die Websocket-Antwort unterwegs war — das ließ die
  Karte von voller Höhe auf eine schmale Textzeile kollabieren und wieder aufspringen. Jetzt
  bleiben die zuletzt geladenen Balken sichtbar (leicht abgedunkelt via CSS-Klasse `.loading`,
  sanfter Opacity-Übergang), bis die neuen Daten da sind — kein Höhensprung mehr. Die
  „Lade Daten…“-Meldung erscheint nur noch beim allerersten Laden (noch keine Balken vorhanden).
- **Fix Race Condition:** Bei schnellem mehrfachem Klicken auf ‹/› liefen mehrere
  Websocket-Anfragen gleichzeitig; eine langsamere ältere Antwort konnte eine neuere
  überschreiben. `_fetchData()` verwirft jetzt Antworten, deren Zeitraum-Schlüssel nicht mehr
  dem aktuell angeforderten entspricht.
- Erfolgreich getestet (Desktop + Smartphone): Navigation, Zeitraum-Wechsel, Achsenbeschriftung,
  Dropdown-Kontrast und flüssiges Blättern ohne Ruckeln bestätigt

**Erledigt (Schritt 4 — Prognoselinie):**
- API-Struktur vorab im HA-Quellcode geprüft: `energy/solar_forecast` liefert
  `{ [config_entry_id]: { wh_hours: { "<ISO-Zeitstempel>": <Wh-Wert> } } }`, ohne
  Zeitraum-Parameter — die Prognose bezieht sich immer auf "jetzt", nicht auf ein frei
  wählbares Datum in der Vergangenheit
- `src/data/forecast.ts` — `fetchSolarForecast()`: ruft die API auf, summiert alle
  konfigurierten Quellen (z. B. mehrere Forecast.Solar-Einträge) zu einer Zeitreihe in kWh;
  `alignForecastToBars()`: ordnet Prognosepunkte den Stundenbalken zu (`null` = keine Prognose
  für diese Stunde)
- `src/chart/bar-chart.ts` — gestrichelte Prognoselinie als SVG-**Overlay** über dem
  HTML/CSS-Balkendiagramm (`position: absolute` auf `.forecast-line`, `viewBox="0 0 100 100"`
  mit prozentualen Koordinaten). Bewusst nur die Linie in SVG, keine Achsenbeschriftung dort —
  Linien verzerren beim nicht-uniformen Strecken nicht, Text schon (siehe Chart-Rendering-
  Entscheidung oben)
- `src/types.ts` — `SolarGenerationCardConfig.forecast?: boolean` (Standard: an); YAML-Override
  zum Abschalten, bis der visuelle Editor in Schritt 5 eine UI dafür bietet
- Prognose wird nur geladen/angezeigt, wenn: Tagesansicht **und** der aktuell angezeigte Tag ist
  heute **und** `forecast !== false` — sonst ergäbe die Linie inhaltlich keinen Sinn
  (Forecast.Solar liefert keine Vergangenheitsdaten) bzw. wäre unnötiger Netzwerk-Traffic
- Prognose-Fehler (z. B. keine Forecast.Solar-Quelle konfiguriert) werden separat abgefangen und
  blenden nur die Linie aus, statt die eigentlichen Erzeugungsdaten mit einer Fehlermeldung zu
  überdecken
- Build + ESLint laufen fehlerfrei; erfolgreich in HA getestet (mit konfigurierter
  Forecast.Solar-Quelle)
