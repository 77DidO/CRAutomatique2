import { createReadStream } from 'fs';
import { writeFile } from 'fs/promises';
import OpenAI from 'openai';
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
    (template?.prompt ? `## Prompt du gabarit\n${template.prompt}\n\n` : '') +
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

async function writeMockOutputs(jobId, job, template) {
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

function formatTimestamp(seconds) {
  const numeric = Number(seconds ?? 0);
  if (Number.isNaN(numeric) || !Number.isFinite(numeric)) {
    return '00:00:00.000';
  }

  const totalMs = Math.max(0, Math.round(numeric * 1000));
  const hours = String(Math.floor(totalMs / 3600000)).padStart(2, '0');
  const minutes = String(Math.floor((totalMs % 3600000) / 60000)).padStart(2, '0');
  const secondsPart = String(Math.floor((totalMs % 60000) / 1000)).padStart(2, '0');
  const milliseconds = String(totalMs % 1000).padStart(3, '0');

  return `${hours}:${minutes}:${secondsPart}.${milliseconds}`;
}

function createVttFromSegments(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return '';
  }

  const lines = ['WEBVTT', ''];
  segments.forEach((segment, index) => {
    const rawText = typeof segment?.text === 'string' ? segment.text.trim() : '';
    if (!rawText) {
      return;
    }

    const start = formatTimestamp(segment?.start ?? index * 5);
    const end = formatTimestamp(segment?.end ?? segment?.start ?? (index + 1) * 5);
    lines.push(`${index + 1}`, `${start} --> ${end}`, rawText, '');
  });

  return lines.join('\n').trimEnd();
}

async function writeOpenAIOutputs({ jobId, job, template, context, pipeline }) {
  const outputs = [];
  const activeTemplate = template ?? context.template ?? null;

  if (pipeline?.transcription !== false) {
    const transcriptionContent = (context.transcriptionText ?? '').trim().length > 0
      ? context.transcriptionText.trim()
      : buildTranscription(job);
    await writeFile(
      jobAssetPath(jobId, 'transcription_raw.txt'),
      `${transcriptionContent}\n`,
      'utf8'
    );
    outputs.push({
      filename: 'transcription_raw.txt',
      label: 'Transcription brute',
      mimeType: 'text/plain'
    });
  }

  if (pipeline?.summary !== false) {
    const summaryContent = (context.summaryMarkdown ?? '').trim().length > 0
      ? context.summaryMarkdown.trim()
      : buildSummary(job, activeTemplate);
    await writeFile(
      jobAssetPath(jobId, 'summary.md'),
      `${summaryContent}\n`,
      'utf8'
    );
    outputs.push({
      filename: 'summary.md',
      label: 'Synthèse Markdown',
      mimeType: 'text/markdown'
    });
  }

  if (pipeline?.subtitles !== false) {
    const vttFromSegments = createVttFromSegments(context.transcriptionSegments ?? []);
    const subtitleContent = (context.subtitlesVtt ?? '').trim().length > 0
      ? context.subtitlesVtt.trim()
      : (vttFromSegments || '').trim().length > 0
        ? vttFromSegments.trim()
        : buildVtt(job);
    await writeFile(
      jobAssetPath(jobId, 'subtitles.vtt'),
      `${subtitleContent}\n`,
      'utf8'
    );
    outputs.push({
      filename: 'subtitles.vtt',
      label: 'Sous-titres VTT',
      mimeType: 'text/vtt'
    });
  }

  return outputs;
}

function createMockPipelineOperations({ template }) {
  return {
    handlers: PIPELINE_STEPS.reduce((acc, step) => ({
      ...acc,
      [step.id]: async ({ step: currentStep }) => {
        await delay(currentStep.duration);
      }
    }), {}),
    async writeOutputs({ jobId, job, template: activeTemplate }) {
      return writeMockOutputs(jobId, job, activeTemplate ?? template ?? null);
    }
  };
}

function createOpenAIPipelineOperations({ jobId, jobStore, templateStore, config, context }) {
  const apiKey = (config?.openaiApiKey ?? config?.llmApiToken ?? process.env.OPENAI_API_KEY ?? '').trim();
  if (!apiKey) {
    throw new Error('Clé API OpenAI manquante dans la configuration.');
  }

  const openai = new OpenAI({ apiKey });
  const whisperConfig = config?.whisper ?? {};
  const pipeline = config?.pipeline ?? {};

  return {
    handlers: {
      ingest: async () => {},
      transcription: async () => {
        if (pipeline?.transcription === false) {
          return;
        }

        const job = jobStore.get(jobId);
        if (!job?.source?.storedName) {
          throw new Error('Source du job introuvable pour la transcription.');
        }

        const sourcePath = jobAssetPath(jobId, job.source.storedName);
        const requestPayload = {
          file: createReadStream(sourcePath),
          model: whisperConfig?.model ?? 'whisper-1',
          response_format: 'verbose_json',
          temperature: typeof whisperConfig?.temperature === 'number'
            ? whisperConfig.temperature
            : 0.2
        };

        if (whisperConfig?.language && whisperConfig.language !== 'auto') {
          requestPayload.language = whisperConfig.language;
        }
        if (whisperConfig?.translate === true) {
          requestPayload.translate = true;
        }

        const transcription = await openai.audio.transcriptions.create(requestPayload);
        context.transcriptionText = (transcription?.text ?? '').trim();
        context.transcriptionSegments = Array.isArray(transcription?.segments)
          ? transcription.segments
          : [];

        if (pipeline?.subtitles !== false && !context.subtitlesVtt) {
          const vtt = createVttFromSegments(context.transcriptionSegments);
          if (vtt.trim().length > 0) {
            context.subtitlesVtt = vtt;
          }
        }
      },
      cleanup: async () => {},
      summaries: async () => {
        if (pipeline?.summary === false) {
          return;
        }

        const transcript = context.transcriptionText;
        if (!transcript) {
          return;
        }

        const job = jobStore.get(jobId);
        context.template = context.template ?? templateStore.getById(job?.template ?? '') ?? null;
        const template = context.template;
        const instructions = (template?.prompt ?? '').trim().length > 0
          ? template.prompt.trim()
          : 'Produis un compte rendu structuré en Markdown à partir de la transcription fournie.';

        const participants = Array.isArray(job?.participants) && job.participants.length > 0
          ? job.participants.join(', ')
          : 'Aucun participant renseigné';

        const messages = [
          {
            role: 'system',
            content: 'Tu es un assistant qui produit des comptes rendus détaillés et structurés en Markdown à partir de transcriptions audio.'
          },
          {
            role: 'user',
            content: [
              `Titre du média : ${job?.title ?? 'Sans titre'}`,
              `Participants : ${participants}`,
              '',
              'Instructions :',
              instructions,
              '',
              'Transcription :',
              transcript
            ].join('\n')
          }
        ];

        const chatModel = (config?.openai?.chatModel ?? config?.chatModel ?? 'gpt-4o-mini').trim();
        const temperature = typeof config?.openai?.temperature === 'number'
          ? config.openai.temperature
          : 0.7;

        const completion = await openai.chat.completions.create({
          model: chatModel,
          messages,
          temperature
        });

        const summary = completion?.choices?.[0]?.message?.content?.trim();
        if (summary) {
          context.summaryMarkdown = summary;
        }
      }
    },
    async writeOutputs({ jobId: currentJobId, job, template }) {
      return writeOpenAIOutputs({
        jobId: currentJobId,
        job,
        template,
        context,
        pipeline
      });
    }
  };
}

export async function runPipeline({ jobId, jobStore, templateStore, configStore }) {
  const context = {
    transcriptionText: '',
    transcriptionSegments: [],
    summaryMarkdown: '',
    subtitlesVtt: '',
    template: null
  };

  try {
    const config = configStore?.get ? await configStore.get() : {};
    context.config = config;
    const provider = typeof config?.llmProvider === 'string'
      ? config.llmProvider.toLowerCase()
      : 'mock';

    const initialJob = jobStore.get(jobId);
    if (!initialJob) {
      throw new Error('Job introuvable.');
    }

    context.template = templateStore.getById(initialJob.template ?? '') ?? null;

    const operations = provider === 'openai'
      ? createOpenAIPipelineOperations({ jobId, jobStore, templateStore, config, context })
      : createMockPipelineOperations({ template: context.template });

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

      const handler = operations.handlers?.[step.id];
      if (handler) {
        await handler({ jobId, jobStore, templateStore, step, context });
      } else {
        await delay(step.duration);
      }

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

    const latestJob = jobStore.get(jobId);
    if (!latestJob) {
      throw new Error('Job introuvable après le traitement.');
    }

    const outputs = await operations.writeOutputs({
      jobId,
      job: latestJob,
      template: context.template
    });

    await jobStore.update(jobId, (current) => {
      current.status = 'completed';
      current.completedAt = new Date().toISOString();
      current.progress = 1;
      current.currentStep = null;
      current.outputs = outputs ?? [];
      current.steps = current.steps.map((stepState) => ({
        ...stepState,
        status: 'done',
        finishedAt: stepState.finishedAt ?? new Date().toISOString()
      }));
      return current;
    });

    await jobStore.appendLog(jobId, 'Traitement terminé avec succès.');
  } catch (error) {
    console.error('Pipeline error', error);
    const existing = jobStore.get(jobId);
    if (!existing) {
      return;
    }

    const message = error?.message ?? 'Erreur inconnue';
    try {
      await jobStore.appendLog(jobId, `Échec du pipeline : ${message}`);
    } catch (logError) {
      console.error('Impossible d\'écrire le journal d\'erreur du pipeline.', logError);
    }

    await jobStore.update(jobId, (job) => {
      job.status = 'failed';
      job.currentStep = null;
      return job;
    });
  }
}
