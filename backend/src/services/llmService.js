import { info } from '../utils/logger.js';

function extractSummary(prompt) {
  if (!prompt) {
    return 'Résumé indisponible.';
  }
  const lines = prompt.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    return 'Résumé indisponible.';
  }
  const relevant = lines.slice(-5);
  return relevant.join(' ');
}

export async function generateSummary(prompt) {
  info('Génération de résumé simulée.');
  const summary = extractSummary(prompt);
  return `Résumé automatique:\n${summary}`;
}
