import './solar-generation-card';

// Registrierung im Karten-Auswahldialog von Home Assistant.
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'solar-generation-card',
  name: 'Solar Generation Card',
  description: 'Zeigt die Solarerzeugung als Balkendiagramm mit Prognose.',
  preview: false,
});

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
