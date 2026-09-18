# Solar & Energiefluss Cards

Zwei eigenständige Lovelace-Karten für Home Assistant rund um eine Solaranlage
(entwickelt für einen Anker Solix Pro 2, funktioniert aber mit jedem Setup, das
passende Energie-Sensoren liefert):

- **Solar Generation Card** — Solarerzeugung als Balkendiagramm (Tag/Woche/Monat/Jahr),
  mit Navigation, Prognoselinie, Tooltips und optionaler Kostenanzeige.
- **Energy Flow Card** — zeigt, woher der Hausbedarf kommt (PV direkt / Speicher / Netz)
  als kombiniertes Ring- und Sankey-Diagramm, plus optionalem Kosten/Gespart-Tab.

Beide Karten holen ihre Daten unabhängig voneinander direkt per Websocket
(`recorder/statistics_during_period`, `energy/solar_forecast`) — sie nutzen **nicht**
die gemeinsame Energy-Dashboard-Datumsauswahl, mehrere Karteninstanzen auf einem
Dashboard beeinflussen sich also nicht gegenseitig.

## Voraussetzungen

- Home Assistant mit aktiviertem `recorder` (Standard) und den benötigten Sensoren
  als **Langzeitstatistik** (state_class `total_increasing`, üblich bei
  Energie-Sensoren von Wechselrichtern/Zählern)
- Für die Prognoselinie der Solar-Karte: eine [Forecast.Solar](https://www.home-assistant.io/integrations/forecast_solar/)-Quelle,
  im Energie-Dashboard (Einstellungen → Dashboards → Energie) als Solarprognose hinterlegt

## Installation über HACS

Dieses Repository ist (noch) nicht im HACS-Standardkatalog gelistet und muss als
**benutzerdefiniertes Repository** hinzugefügt werden:

1. HACS öffnen → oben rechts auf die drei Punkte → **Benutzerdefinierte Repositories**
2. Repository-URL eintragen, Kategorie **Dashboard** auswählen, hinzufügen
3. "Solar & Energiefluss Cards" in HACS suchen und installieren
4. Home Assistant neu laden (Browser-Cache ggf. hart leeren)
5. Falls die Ressource nicht automatisch eingetragen wurde: Einstellungen →
   Dashboards → oben rechts drei Punkte → Ressourcen → hinzufügen:
   `/hacsfiles/solar-cards/solar-cards.js`, Typ **JavaScript-Modul**

## Manuelle Installation (ohne HACS)

1. `solar-cards.js` von der [neuesten Release](../../releases/latest) herunterladen
2. Datei nach `<config>/www/solar-cards.js` kopieren
3. Als Ressource einbinden: Einstellungen → Dashboards → ⋮ → Ressourcen → hinzufügen:
   `/local/solar-cards.js`, Typ **JavaScript-Modul**

## Solar Generation Card

```yaml
type: custom:solar-generation-card
title: Solar
entity_1: sensor.pv_erzeugung_taeglich
name_1: Erzeugung
```

Bis zu 5 Entitäten mit eigenem Namen sind möglich (per Tabs umschaltbar,
z. B. mehrere Wechselrichter/Strings) — dafür `entity_2`…`entity_5` und
`name_2`…`name_5` ergänzen. Alle Optionen (Zeiträume, Prognose, Balkenfarbe,
Diagrammhöhe, Strompreis) lassen sich bequem über den visuellen Editor setzen
(Karte hinzufügen → kein YAML nötig).

## Energy Flow Card

```yaml
type: custom:energy-flow-card
title: Energiefluss
pv_entity: sensor.pv_erzeugung
battery_charge_entity: sensor.batterie_laden
battery_discharge_entity: sensor.batterie_entladen
grid_import_entity: sensor.netzbezug
grid_export_entity: sensor.netzeinspeisung
```

Der PV-Direktverbrauch wird automatisch berechnet
(PV-Erzeugung − Batterie-Laden − Netzeinspeisung) — dafür ist kein eigener Sensor nötig.
Mit einem hinterlegten Strompreis (`price_per_kwh`, im visuellen Editor einstellbar)
erscheint zusätzlich ein "Kosten"-Tab mit denselben Werten in €.

## Entwicklung

```bash
npm install
npm run start   # baut im Watch-Modus und startet einen lokalen Server für dist/
```

Die gebaute Datei liegt danach unter `dist/solar-cards.js` und ist per lokalem Server
unter `http://<dein-rechner>:5000/solar-cards.js` erreichbar (als HA-Ressource vom Typ
„JavaScript-Modul" einbinden).

```bash
npm run build   # einmaliger Produktions-Build
npm run lint    # ESLint
```

## Release erstellen

Ein Tag im Format `v*` (z. B. `v1.0.0`) pushen — eine GitHub Action baut die Karten
automatisch und veröffentlicht `solar-cards.js` als Anhang eines neuen GitHub-Release,
das HACS anschließend zum Download anbietet.

## Lizenz

[MIT](LICENSE)
