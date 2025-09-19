import { PIPELINE_STEPS, STEP_COUNT } from './constants.js';
import { stepHandlers } from './steps/index.js';

// Orchestrator in charge of executing each workflow step sequentially while
// keeping the JobStore in sync (status, progress, logs).

const noop = async () => {};

function getHandler(stepId) {
  const handler = stepHandlers[stepId];
  if (!handler) {
    return noop;
  }
  if (typeof handler === 'function') {
    return handler;
  }
  if (handler && typeof handler.execute === 'function') {
    return handler.execute.bind(handler);
  }
  return noop;
}

export async function runOrchestrator({
  jobId,
  jobStore,
  templateStore,
  config,
  context,
  logger
}) {
  const baseLogger = logger.child({ jobId, scope: 'orchestrator' });
  baseLogger.info('Début du workflow.');

  for (let index = 0; index < PIPELINE_STEPS.length; index += 1) {
    const step = PIPELINE_STEPS[index];
    const stepLogger = baseLogger.child({ step: step.id });

    await jobStore.update(jobId, (job) => {
      // Set the job in processing state and mark the step as running.
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

    // Persist a human-readable log entry for the step start.
    await jobStore.appendLog(jobId, step.startLog);
    stepLogger.info('Étape démarrée.');

    try {
      const handler = getHandler(step.id);
      // Each step receives the shared context and dependencies via dependency injection.
      await handler({ jobId, jobStore, templateStore, config, context, logger: stepLogger });
      stepLogger.info('Étape terminée.');
    } catch (error) {
      stepLogger.error('Erreur lors de l\'étape.', { error: error?.message, stack: error?.stack });
      throw error;
    }

    await jobStore.update(jobId, (job) => {
      // Mark the step as completed and update the global progress indicator.
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

  baseLogger.info('Workflow terminé.');
}
