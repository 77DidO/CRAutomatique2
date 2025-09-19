import { writeFile } from 'fs/promises';
import { jobAssetPath } from '../config/paths.js';

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

const STEP_COUNT = PIPELINE_STEPS.length;

export function createInitialSteps() {
  return PIPELINE_STEPS.map((step) => ({
    id: step.id,
    label: step.label,
    status: 'pending',
    startedAt: null,
    finishedAt: null
  }));
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildSummary(job, template) {
  const participantList = job.participants?.length
    ? job.participants.map((participant) => `- ${participant}`).join('\n')
    : '- Aucun participant déclaré';

  return `# Synthèse du traitement « ${job.title} »\n\n` +
    `**Gabarit utilisé :** ${template?.name ?? job.template}\n\n` +
    `**Statut final :** ${job.status}\n` +
    `**Durée totale estimée :** ${Math.round(STEP_COUNT * 1.5)} minutes\n\n` +
    `## Participants\n${participantList}\n\n` +
    `## Résumé automatique\n` +
    `Ce document a été généré automatiquement afin d'illustrer le résultat d'un pipeline de transcription.`;
}

function buildTranscription(job) {
  return [
    `Transcription simulée pour « ${job.title} »`,
    '',
    '00:00:00.000 --> 00:00:10.000',
    'Bonjour à tous, merci de participer à cette session.',
    '',
    '00:00:10.000 --> 00:00:18.000',
    'Ce texte sert d\'exemple de transcription générée par la plateforme.',
    '',
    '00:00:18.000 --> 00:00:30.000',
    'Les vraies intégrations pourront remplacer ce contenu par une sortie réelle.'
  ].join('\n');
}

function buildVtt(job) {
  return [
    'WEBVTT',
    '',
    '00:00:00.000 --> 00:00:05.000',
    'Bonjour et bienvenue.',
    '',
    '00:00:05.000 --> 00:00:12.000',
    `Traitement simulé pour ${job.title}.`,
    '',
    '00:00:12.000 --> 00:00:18.000',
    'Merci pour votre attention.'
  ].join('\n');
}

async function writeOutputs(jobId, job, template) {
  const outputs = [
    {
      filename: 'transcription_raw.txt',
      label: 'Transcription brute',
      mimeType: 'text/plain',
      builder: buildTranscription
    },
    {
      filename: 'summary.md',
      label: 'Synthèse Markdown',
      mimeType: 'text/markdown',
      builder: buildSummary
    },
    {
      filename: 'subtitles.vtt',
      label: 'Sous-titres VTT',
      mimeType: 'text/vtt',
      builder: buildVtt
    }
  ];

  for (const output of outputs) {
    const content = output.builder(job, template);
    await writeFile(jobAssetPath(jobId, output.filename), `${content}\n`, 'utf8');
  }

  return outputs.map(({ builder, ...rest }) => rest);
}

export async function runPipeline({ jobId, jobStore, templateStore }) {
  try {
    for (let index = 0; index < PIPELINE_STEPS.length; index += 1) {
      const step = PIPELINE_STEPS[index];

      await jobStore.update(jobId, (job) => {
        job.status = 'processing';
        job.currentStep = step.id;
        job.steps = job.steps.map((stepState) => {
          if (stepState.id === step.id) {
            return {
              ...stepState,
              status: 'running',
              startedAt: stepState.startedAt ?? new Date().toISOString()
            };
          }
          if (stepState.status === 'running') {
            return {
              ...stepState,
              status: 'done',
              finishedAt: new Date().toISOString()
            };
          }
          return stepState;
        });
        job.progress = index / STEP_COUNT;
        return job;
      });

      await jobStore.appendLog(jobId, step.startLog);
      await delay(step.duration);

      await jobStore.update(jobId, (job) => {
        job.steps = job.steps.map((stepState) => {
          if (stepState.id === step.id) {
            return {
              ...stepState,
              status: 'done',
              finishedAt: new Date().toISOString()
            };
          }
          return stepState;
        });
        job.progress = (index + 1) / STEP_COUNT;
        return job;
      });

      await jobStore.appendLog(jobId, step.endLog);
    }

    const job = jobStore.get(jobId);
    const template = templateStore.getById(job?.template ?? '');
    const outputs = await writeOutputs(jobId, job, template);

    await jobStore.update(jobId, (current) => {
      current.status = 'completed';
      current.completedAt = new Date().toISOString();
      current.progress = 1;
      current.currentStep = null;
      current.outputs = outputs;
      current.steps = current.steps.map((stepState) => ({
        ...stepState,
        status: 'done',
        finishedAt: stepState.finishedAt ?? new Date().toISOString()
      }));
      return current;
    });

    await jobStore.appendLog(jobId, 'Traitement terminé avec succès.');
  } catch (error) {
    const existing = jobStore.get(jobId);
    if (!existing) {
      return;
    }

    await jobStore.appendLog(jobId, `Échec du pipeline : ${error.message}`);
    await jobStore.update(jobId, (job) => {
      job.status = 'failed';
      job.currentStep = null;
      return job;
    });
  }
}
