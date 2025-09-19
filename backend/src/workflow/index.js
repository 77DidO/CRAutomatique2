import { createLogger } from '../utils/logger.js';
import { PIPELINE_STEPS, STEP_COUNT, createInitialSteps } from './constants.js';
import { createWorkflowContext } from './context.js';
import { runOrchestrator } from './orchestrator.js';
import { writePipelineOutputs } from './outputs/writer.js';

export { PIPELINE_STEPS, STEP_COUNT, createInitialSteps };

export async function runPipeline({ jobId, jobStore, templateStore, configStore }) {
  const logger = createLogger({ scope: 'pipeline', jobId });
  logger.info('Pipeline initialisé.');

  try {
    const config = configStore?.get ? await configStore.get() : {};
    const job = jobStore.get(jobId);

    if (!job) {
      throw new Error('Job introuvable.');
    }

    const template = templateStore?.getById ? templateStore.getById(job.template ?? '') : null;
    const context = createWorkflowContext({ jobId, config, template });

    // Execute each workflow step sequentially; the orchestrator updates the job along the way.
    await runOrchestrator({ jobId, jobStore, templateStore, config, context, logger });

    const latestJob = jobStore.get(jobId);
    if (!latestJob) {
      throw new Error('Job introuvable après le traitement.');
    }

    // Persist all generated assets (transcription, summary, subtitles).
    const outputs = await writePipelineOutputs({ jobId, job: latestJob, context, config, logger });

    await jobStore.update(jobId, (draft) => {
      draft.status = 'completed';
      draft.completedAt = new Date().toISOString();
      draft.progress = 1;
      draft.currentStep = null;
      draft.outputs = outputs;
      draft.steps = draft.steps.map((step) => ({
        ...step,
        status: 'done',
        finishedAt: step.finishedAt ?? new Date().toISOString()
      }));
      return draft;
    });

    await jobStore.appendLog(jobId, 'Traitement terminé avec succès.');
    logger.info('Pipeline terminé avec succès.', { outputs: outputs.length });
  } catch (error) {
    logger.error('Échec du pipeline.', { error: error?.message, stack: error?.stack });

    try {
      await jobStore.update(jobId, (draft) => {
        draft.status = 'failed';
        draft.completedAt = new Date().toISOString();
        draft.currentStep = null;
        return draft;
      });
    } catch (updateError) {
      logger.error('Impossible de mettre à jour le job après un échec.', {
        error: updateError?.message
      });
    }

    try {
      await jobStore.appendLog(jobId, `Échec du pipeline : ${error?.message ?? 'Erreur inconnue'}.`);
    } catch (logError) {
      logger.error('Impossible d\'écrire le log d\'échec.', { error: logError?.message });
    }

    throw error;
  }
}
