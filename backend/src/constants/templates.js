export const DEFAULT_TEMPLATE_ID = 'standard';
export const LANGUAGE_INSTRUCTION = 'Réponds en français.';

export const DEFAULT_TEMPLATES = [
  {
    id: 'faithful',
    label: 'Résumé fidèle',
    prompt:
      "Résume fidèlement cette transcription de réunion. Ne rajoute rien. Conserve exactement les chiffres, dates et noms.\\n\\n{text}"
  },
  {
    id: 'standard',
    label: 'Résumé standard',
    prompt: "Résume ce texte de façon claire et concise :\\n\\n{text}"
  },
  {
    id: 'note',
    label: 'Note de synthèse',
    prompt:
      "Rédige une note de synthèse concise. 1. Commence par un bref paragraphe de contexte. 2. Liste les points essentiels sous forme de puces, en gardant chiffres, dates et décisions. 3. Termine par les actions ou recommandations explicites.\\n\\n{text}"
  },
  {
    id: 'interview',
    label: 'Interview (Q/R)',
    prompt:
      "Synthétise cette interview au format Markdown. Présente une suite de questions/réponses : question en **gras**, réponse concise et factuelle. N’invente aucune information. {language_instruction}\\n\\n{text}"
  },
  {
    id: 'reunion',
    label: 'Compte rendu de réunion',
    prompt:
      "Produis un compte rendu de réunion structuré en Markdown, avec sections :\\n## Thème – quelques phrases de contexte.\\n## Participants – liste des présents.\\n## Décisions – sous forme de puces.\\n## Actions à venir – sous forme de puces, avec responsables et échéances si mentionnés.\\n\\n{text}"
  }
];

function normalizeTemplateList(templates) {
  if (!Array.isArray(templates) || templates.length === 0) {
    return DEFAULT_TEMPLATES.map((template) => ({ ...template }));
  }

  const usedIds = new Set();
  const sanitized = [];

  templates.forEach((template, index) => {
    if (!template || typeof template !== 'object') {
      return;
    }

    const baseId =
      typeof template.id === 'string' && template.id.trim() ? template.id.trim() : `template-${index + 1}`;
    let candidateId = baseId;
    let suffix = 1;
    while (usedIds.has(candidateId)) {
      candidateId = `${baseId}-${suffix++}`;
    }
    usedIds.add(candidateId);

    const label = typeof template.label === 'string' ? template.label : '';
    const prompt = typeof template.prompt === 'string' ? template.prompt : '';

    sanitized.push({ id: candidateId, label, prompt });
  });

  return sanitized.length > 0 ? sanitized : DEFAULT_TEMPLATES.map((template) => ({ ...template }));
}

function normalizeRubricsList(rubrics) {
  if (!Array.isArray(rubrics)) {
    return [];
  }
  return rubrics
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

export function buildSummaryPrompt(templateId, text, options = {}) {
  const {
    templates = DEFAULT_TEMPLATES,
    languageInstruction = LANGUAGE_INSTRUCTION,
    defaultTemplateId,
    rubrics
  } = options;
  const availableTemplates = normalizeTemplateList(templates);
  const fallbackId = defaultTemplateId && availableTemplates.some((tpl) => tpl.id === defaultTemplateId)
    ? defaultTemplateId
    : DEFAULT_TEMPLATE_ID;

  const fallbackTemplate =
    availableTemplates.find((template) => template.id === fallbackId)
    || availableTemplates[0]
    || DEFAULT_TEMPLATES[0];

  const template =
    availableTemplates.find((item) => item.id === templateId)
    || fallbackTemplate;

  const promptTemplate = typeof template.prompt === 'string' && template.prompt.length > 0
    ? template.prompt
    : fallbackTemplate.prompt;

  const safePromptTemplate = promptTemplate || '';
  const safeText = text || '';
  const resolvedInstruction = typeof languageInstruction === 'string' ? languageInstruction : LANGUAGE_INSTRUCTION;

  const replacePlaceholder = (value, placeholder, replacement) => value.split(placeholder).join(replacement);

  const withInstruction = replacePlaceholder(safePromptTemplate, '{language_instruction}', resolvedInstruction);

  const normalizedRubrics = normalizeRubricsList(rubrics);
  const rubricsList = normalizedRubrics.map((item, index) => `${index + 1}. ${item}`).join('\n');
  let promptWithRubrics = replacePlaceholder(withInstruction, '{rubrics}', rubricsList);

  if (normalizedRubrics.length > 0 && !withInstruction.includes('{rubrics}')) {
    const instruction = `\n\nStructure le résumé avec les rubriques suivantes (dans l'ordre) :\n${rubricsList}`;
    promptWithRubrics = `${withInstruction}${instruction}`;
  }

  return replacePlaceholder(promptWithRubrics, '{text}', safeText);
}

export { normalizeTemplateList as ensureTemplateList };
