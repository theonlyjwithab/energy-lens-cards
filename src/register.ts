import './solar-generation-card';
import './energy-flow-card';

// Registrierung im Karten-Auswahldialog von Home Assistant.
window.customCards = window.customCards || [];
window.customCards.push(
  {
    type: 'solar-generation-card',
    name: 'Solar Generation Card',
    description: 'Zeigt die Solarerzeugung als Balkendiagramm mit Prognose.',
    preview: false,
  },
  {
    type: 'energy-flow-card',
    name: 'Energy Flow Card',
    description: 'Zeigt, woher der Hausbedarf kommt (PV / Speicher / Netz) als Fluss- und Ring-Diagramm.',
    preview: false,
  },
);

declare global {
  interface Window {
    customCards: Array<{
      type: string;
      name: string;
      description: string;
      preview?: boolean;
    }>;
  }
}
