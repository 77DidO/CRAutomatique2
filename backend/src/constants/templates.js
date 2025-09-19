export const DEFAULT_TEMPLATE_ID = 'standard';
export const LANGUAGE_INSTRUCTION = 'Réponds en français.';

export const SUMMARY_PROMPTS = {
  faithful:
    "Résume fidèlement cette transcription de réunion. Ne rajoute rien. Conserve exactement les chiffres, dates et noms.\n\n{text}",
  standard: "Résume ce texte de façon claire et concise :\n\n{text}",
  note:
    "Rédige une note de synthèse concise. 1. Commence par un bref paragraphe de contexte. 2. Liste les points essentiels sous forme de puces, en gardant chiffres, dates et décisions. 3. Termine par les actions ou recommandations explicites.\n\n{text}",
  interview:
    "Synthétise cette interview au format Markdown. Présente une suite de questions/réponses : question en **gras**, réponse concise et factuelle. N’invente aucune information. {language_instruction}\n\n{text}",
  reunion:
    "Produis un compte rendu de réunion structuré en Markdown, avec sections :\n## Thème – quelques phrases de contexte.\n## Participants – liste des présents.\n## Décisions – sous forme de puces.\n## Actions à venir – sous forme de puces, avec responsables et échéances si mentionnés.\n\n{text}"
};

export const REPORT_TEMPLATE_OPTIONS = [
  { id: 'faithful', label: 'Résumé fidèle' },
  { id: 'standard', label: 'Résumé standard' },
  { id: 'note', label: 'Note de synthèse' },
  { id: 'interview', label: 'Interview (Q/R)' },
  { id: 'reunion', label: 'Compte rendu de réunion' }
];

export function buildSummaryPrompt(templateId, text, options = {}) {
  const templateKey = SUMMARY_PROMPTS[templateId] ? templateId : DEFAULT_TEMPLATE_ID;
  const promptTemplate = SUMMARY_PROMPTS[templateKey];
  const safeText = text || '';
  const languageInstruction = options.languageInstruction || LANGUAGE_INSTRUCTION;
  return promptTemplate
    .replace('{language_instruction}', languageInstruction)
    .replace('{text}', safeText);
}

export default REPORT_TEMPLATE_OPTIONS;
