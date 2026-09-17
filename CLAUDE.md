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
2. **Datenabfrage + Tagesansicht** — `recorder/statistics_during_period`, Stundenbalken ← nächster Schritt
3. **Navigation + weitere Zeiträume** — Header mit Datum/Jetzt/Pfeile, Tag/Woche/Monat/Jahr
4. **Prognoselinie** — `energy/solar_forecast`, gestrichelt, ein-/ausschaltbar
5. **Visueller Editor** — `getConfigElement`, alle Config-Optionen
6. **HACS/Release-Setup** — hacs.json verfeinern, GitHub Action (Tag `v*` → Build + Release),
   README auf Deutsch mit Installationsanleitung

## Getroffene Entscheidungen

- **Sprache/Framework:** TypeScript + Lit (Standard für HA-Custom-Cards, leichtgewichtig,
  Web-Components-basiert).
- **Chart-Rendering:** Eigenes SVG statt fertiger Chart-Library (Chart.js/ECharts). Begründung:
  Balken + eine Linie ist geometrisch einfach genug, spart 40–200 KB, vermeidet
  Theming-Hakeligkeiten (Canvas vs. DOM/CSS-Variablen), und ist lehrreicher. Bei Bedarf später
  austauschbar (z. B. uPlot), da Datenschicht unabhängig vom Rendering ist.
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
- Nutzer testet aktuell die Einbindung als HA-Ressource (noch keine Rückmeldung, ob sichtbar)

**Nächster Schritt (Schritt 2):**
- Websocket-Abfrage `recorder/statistics_during_period` implementieren (Datenschicht unter
  `src/data/statistics.ts`)
- Ergebnisse in Stundenbalken für die Tagesansicht umrechnen
- Statisches SVG-Balkendiagramm rendern (`src/chart/bar-chart.ts`)
- Danach: kurz erklären, wie der Nutzer das mit einer echten Entity-ID in HA testet
