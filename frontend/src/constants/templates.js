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

export default DEFAULT_TEMPLATES;
