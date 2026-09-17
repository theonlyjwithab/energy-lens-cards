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
- Bis zu 4 Entitäten mit eigenem Namen, per Tabs umschaltbar (z. B. mehrere Wechselrichter/Strings)
- Optionale Kostenanzeige (Strompreis in €/kWh konfigurierbar) neben der kWh-Summe

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
5. **Visueller Editor** — `getConfigElement`, alle Config-Optionen ✅ erledigt (mit einer
   Einschränkung, siehe Stand unten)
6. **HACS/Release-Setup** — hacs.json verfeinern, GitHub Action (Tag `v*` → Build + Release),
   README auf Deutsch mit Installationsanleitung ← nächster Schritt

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

**Erledigt (Schritt 5 — Visueller Editor):**
- `eslint.config.js` — Regel `@typescript-eslint/no-unused-vars` um `argsIgnorePattern: '^_'`
  ergänzt, damit von HA vorgegebene Funktionssignaturen (z. B. `getStubConfig(hass, entities)`,
  wo `hass` ungenutzt ist) nicht jedes Mal einzeln umschifft werden müssen
- `src/types.ts` — `SolarGenerationCardConfig` erweitert: `default_period?`, `periods?`
  (wählbare Zeiträume im Dropdown), `bar_color?`, `height?`
- `src/editor.ts` — neue Komponente `<solar-generation-card-editor>`, baut auf `<ha-form>` auf
  (von der HA-Frontend-App global registriertes Formular-Element: erzeugt aus einem
  Schema automatisch Entity-Picker, Dropdowns, Zahlenfelder etc., themefähig ohne eigenes
  CSS). Meldet Änderungen per `config-changed`-Event nach oben (Standard-HA-Konvention)
- `src/solar-generation-card.ts` — `getConfigElement()` liefert den Editor, `getStubConfig()`
  sucht beim Hinzufügen der Karte automatisch eine passende `sensor.*`-Entität; `default_period`
  wird nur beim allerersten `setConfig()`-Aufruf angewendet (nicht bei jeder späteren
  Config-Änderung im Editor, sonst würde z. B. das Ändern der Balkenfarbe die Navigation
  zurücksetzen); `periods` schränkt die Dropdown-Auswahl ein, mit automatischem Fallback auf den
  ersten erlaubten Zeitraum, falls der aktuelle nicht mehr erlaubt ist; `bar_color`/`height`
  werden ans Chart durchgereicht
- **Bewusst nicht umgesetzt:** „Auswahl Forecast.Solar-Eintrag“ (falls mehrere Prognosequellen
  konfiguriert sind, eine bestimmte auswählen statt alle zu summieren). Dafür bräuchte man
  zusätzlich `energy/get_prefs` (um die konfigurierten `config_entry_solar_forecast`-IDs zu
  finden) und vermutlich `config/config_entries/get` (für lesbare Namen) — deutlich mehr
  API-Fläche für einen Fall, der aktuell (nur eine Forecast.Solar-Quelle im Einsatz) keinen
  Unterschied macht. Kann bei Bedarf später ergänzt werden.
- **Balkenfarbe:** `bar_color` ist im Editor ein Dropdown mit Standardfarben (Theme-Akzentfarbe,
  Blau, Grün, Orange, Gelb, Rot, Lila) statt einem freien Textfeld — per `custom_value: true` am
  Select-Selector kann trotzdem eine eigene CSS-Farbe eingegeben werden, falls keine Vorgabe passt
- Build + ESLint laufen fehlerfrei; Test in HA (Karte über UI hinzufügen, Editor ausprobieren)
  bestätigt

**Erledigt (zusätzlich — Achsen-Feinschliff + Tooltips):**
- `src/chart/bar-chart.ts` — `computeNiceStep()`: rundet die y-Achsen-Schrittweite auf "schöne"
  Werte (1/2/5 × Zehnerpotenz, wie bei den meisten Chart-Bibliotheken), daraus abgeleitet
  `axisMax` (Balken/Prognoselinie skalieren jetzt gegen diese gerundete Achsen-Obergrenze, nicht
  mehr gegen den rohen Maximalwert — dadurch reicht der höchste Balken nicht mehr bis ganz an
  den Rand, wie im Referenzbild)
- Y-Achse zeigt jetzt mehrere Zwischenwerte statt nur Max/0, mit "kWh"-Einheit einmal oben statt
  bei jeder Zahl; horizontale Gitterlinien je Tick-Wert als absolut positionierte Divs über den
  Balken
- Tooltip bei Hover (Desktop) bzw. Tap (Mobil) auf einen Balken: Zeitraum (z. B. "12:00 – 13:00"),
  Erzeugung in kWh, plus Vorhersage-Zeile falls für diese Stunde eine Prognose vorliegt. Tap
  toggelt den Tooltip (kein Hover auf Touch-Geräten verfügbar)
- `src/utils/format.ts` — `formatBarTooltipLabel()`: volle Zeitraum-Beschreibung pro Balken für
  den Tooltip (anders als `formatBarLabels()`, das für die x-Achse ausdünnt)
- Bekannte kleine Einschränkung: Der Tooltip ist horizontal auf die Balkenmitte zentriert: beim
  äußersten linken/rechten Balken kann er dadurch leicht über den Kartenrand hinausragen bzw. an
  `ha-card`s `overflow: hidden` abgeschnitten werden. Bei Bedarf später mit Rand-Kollisions-
  erkennung nachschärfen.
- **Fix Mobile-Tooltip (2 Taps nötig):** `mouseenter`+`click` zusammen sorgten auf Touch-Geräten
  dafür, dass ein einzelner Tap zwei simulierte Events auslöste (Browser-Kompatibilitätsverhalten
  für Mausseiten): `mouseenter` zeigte den Tooltip, das direkt folgende `click` schaltete ihn
  über dieselbe Umschalt-Logik sofort wieder aus. Fix: Umstieg auf Pointer Events
  (`pointerenter`/`pointerleave`/`pointerup`), die über `event.pointerType` zwischen Maus und
  Touch unterscheiden — Hover (mouseenter/leave-Ersatz) reagiert jetzt nur auf `pointerType ===
  'mouse'`, das Tap-Toggle nur auf `pointerType !== 'mouse'`. Dadurch konkurrieren beide Pfade
  nicht mehr miteinander.

**Erledigt (zusätzlich — Mehrfach-Entitäten mit Tabs + Kostenanzeige):**
- Nutzerwunsch: mehrere Entitäten mit eigenem Namen per Tabs umschaltbar (angelehnt an die
  Quelle-Tabs im eingebauten HA-Energie-Dashboard), außerdem eine Kostenanzeige (kWh × Strompreis)
- Editor-Ansatz bewusst als **feste Anzahl Slots** gewählt (Nutzerentscheidung), nicht als frei
  erweiterbare Liste: `ha-form` unterstützt keine dynamischen Listen von Objekten nativ — dafür
  bräuchte es eine komplett eigene Mini-Oberfläche (Entity-Picker + Textfeld je Zeile,
  Hinzufügen/Entfernen, eigene Zustandsverwaltung). 5 feste Slots (`entity_1`…`entity_5` +
  `name_1`…`name_5`) decken den Bedarf (z. B. mehrere Wechselrichter/Strings) ab und bleiben mit
  `ha-form` einfach umsetzbar; Grenze bei Bedarf später leicht erhöhbar
- `src/utils/entities.ts` — `getEntitySlots()`: liest die belegten Slots aus der Config;
  `migrateConfig()`: wandelt die alte Einzel-Entity-Config (`entity: "sensor.x"`) einmalig
  automatisch in `entity_1` um, damit die bereits produktiv genutzte Karte nach dem Update ohne
  YAML-Anpassung weiterläuft (Migration läuft sowohl in der Karte als auch im Editor, damit auch
  eine zuvor per YAML angelegte Karte im Editor korrekt vorausgefüllt erscheint)
- `src/editor.ts` — Schema-Felder für die 5 Slots als `type: 'grid'`-Paare (Entität + Name
  nebeneinander), plus `price_per_kwh`-Zahlenfeld (Einheit "€/kWh")
- `src/solar-generation-card.ts` — Tabs-Leiste erscheint nur, wenn mehr als 1 Entität konfiguriert
  ist (bei nur einer Entität bleibt die Karte wie bisher, ohne unnötige UI); Tab-Wechsel löst
  einen neuen Datenabruf für die gewählte Entität aus; Kostenanzeige nur sichtbar, wenn
  `price_per_kwh` gesetzt ist, formatiert über
  `Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' })`
- **Titel-Fix:** Leeres Titelfeld im Editor lieferte über `ha-form` `undefined` statt einem leeren
  String; unser `?? 'Solar'`-Fallback zeigte dadurch fälschlich "Solar" an, obwohl der Nutzer den
  Titel bewusst geleert hatte. Fix: kein Fallback mehr, die Titelzeile wird bei leerem Titel
  komplett ausgeblendet statt eine leere Zeile mit Platzhaltertext zu zeigen
- **Erweiterung auf 5 Entitäten + Vorhersage pro Entität:** `entity_5`/`name_5` ergänzt; außerdem
  pro Slot ein eigenes `forecast_N`-Checkbox-Feld (z. B. sinnvoll, wenn eine der Entitäten kein
  reiner PV-Ertragssensor ist, für den eine Solar-Prognose keinen Sinn ergibt). Auflösung in
  `getEntitySlots()`: `forecast_N` falls gesetzt, sonst Fallback auf das alte globale
  `forecast`-Feld (falls vorhanden), sonst Standard „an“ — dadurch bleiben alte Configs mit
  globalem `forecast: false` weiterhin gültig, ohne dass man sie manuell migrieren muss; das
  globale Feld ist im Editor nicht mehr sichtbar (durch die Slot-Checkboxen ersetzt), funktioniert
  aber weiterhin per YAML
- Build, ESLint und `tsc --noEmit` (explizit gegengeprüft, da `vite build`/esbuild selbst keine
  Typprüfung durchführt) laufen fehlerfrei; Test in HA steht noch aus

**Erledigt (zusätzlich — Prognose-Checkbox-Bug, x-Achse, Preis-Toggle + Tooltip):**
- **Bugfix Prognose-Checkbox:** Eine `boolean`-Checkbox in `ha-form` zeigt bei Wert `undefined`
  visuell "aus" an — unsere Logik behandelte `undefined` bisher aber als "an" (Standard). Dadurch
  wirkte es so, als würde die deaktivierte Checkbox ignoriert, obwohl sie technisch nie aktiv
  deaktiviert (auf `false`) gesetzt worden war. Fix in `migrateConfig()`: Sobald eine Entität
  gesetzt ist, wird ihr `forecast_N` beim Laden einmalig explizit auf den tatsächlichen
  Standardwert (`true`, bzw. das alte globale `forecast`-Feld) befüllt — die Checkbox zeigt damit
  von Anfang an den echten Zustand, und ein Abhaken führt jetzt sichtbar zum Ausblenden der
  Prognose. Dieselbe Behandlung wurde vorsorglich gleich für `show_cost` übernommen (siehe unten),
  um denselben Fehler dort nicht zu wiederholen.
- **Fix x-Achsen-Beschriftung (Tagesansicht), 1. Iteration:** `Intl.DateTimeFormat` mit
  `hour: 'numeric'` formatiert im Deutschen als „0 Uhr“ — zu breit, per CSS-Ellipsis mitten im
  Wort abgeschnitten ("00 ..."). Erst auf „00:00“ (mit Minute) umgestellt, siehe unten für die
  finale, noch kompaktere Lösung.
- **Neu: Kostenanzeige-Checkbox** (`show_cost`, Standard „an“ sobald `price_per_kwh` gesetzt ist):
  erlaubt, die Kostenanzeige auszublenden, ohne den hinterlegten Preis zu löschen
- **Neu: Preis im Tooltip** — `bar-chart.ts` bekommt optional `pricePerKwh` und zeigt bei
  Hover/Tap zusätzlich „Kosten: 0,21 €“ für den jeweiligen Balken, sofern die Kostenanzeige aktiv
  ist
- Build, ESLint und `tsc --noEmit` laufen fehlerfrei; Test in HA steht noch aus

**Erledigt (zusätzlich — noch kompaktere x-Achse + Kosten-Checkbox pro Entität):**
- **X-Achse finalisiert:** Statt „00:00“ jetzt nur die zweistellige Stunde („02“). Da
  `hour`-only in `Intl.DateTimeFormat` im Deutschen den Zusatz „Uhr“ erzwingt, wird stattdessen
  über `formatToParts()` gezielt nur der `type: 'hour'`-Teil herausgegriffen — robust gegenüber
  Locale-Eigenheiten, da Wortzusätze/Literale in den Parts einfach ignoriert werden, statt sie per
  String-Zuschneiden zu entfernen
- **Kostenanzeige jetzt pro Entität** statt global, analog zur Vorhersage-Checkbox:
  `show_cost_1`…`show_cost_5` in `types.ts`, aufgelöst in `getEntitySlots()` als `EntitySlot.showCost`
  (Fallback-Kette: eigener Wert → altes globales `show_cost` → Standard „an“). `migrateConfig()`
  befüllt `show_cost_N` beim Laden ebenfalls explizit (nur wenn `price_per_kwh` gesetzt ist), aus
  demselben Grund wie beim Vorhersage-Fix (Checkbox soll nie `undefined` zeigen)
- `src/editor.ts` — `price_per_kwh` ist jetzt oben (vor den Entitäts-Slots) platziert, da sich die
  Kosten-Checkboxen der einzelnen Slots inhaltlich darauf beziehen; jeder Slot hat jetzt eine
  `type: 'grid'`-Zeile mit „Vorhersage zeigen“ + „Kosten zeigen“ nebeneinander
- Build, ESLint und `tsc --noEmit` laufen fehlerfrei; Test in HA steht noch aus
