export const PIPELINE_STEPS = [
  {
    id: 'ingest',
    label: 'Préparation du média',
    duration: 1200,
    startLog: 'Analyse du média et vérification du format.',
    endLog: 'Préparation terminée.'
  },
  {
    id: 'transcription',
    label: 'Transcription',
    duration: 2200,
    startLog: 'Transcription automatique en cours.',
    endLog: 'Transcription générée.'
  },
  {
    id: 'cleanup',
    label: 'Nettoyage & segmentation',
    duration: 1400,
    startLog: 'Nettoyage des artefacts et découpage en séquences.',
    endLog: 'Nettoyage terminé.'
  },
  {
    id: 'summaries',
    label: 'Synthèse & exports',
    duration: 1800,
    startLog: 'Génération des synthèses, sous-titres et résumés.',
    endLog: 'Exports disponibles.'
  }
];

export const STEP_COUNT = PIPELINE_STEPS.length;

export function createInitialSteps() {
  return PIPELINE_STEPS.map((step) => ({
    id: step.id,
    label: step.label,
    status: 'pending',
    startedAt: null,
    finishedAt: null
  }));
}
