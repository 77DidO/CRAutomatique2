import type { PipelineContext } from '../../types/index.js';

export async function summariseStep(context: PipelineContext): Promise<void> {
  const { job, config, template, services, jobStore, logger } = context;

  if (!config.pipeline.enableSummaries) {
    // Permet de court-circuiter l'appel LLM lorsqu'il est désactivé dans la configuration.
    await jobStore.appendLog(job.id, 'Synthèse LLM désactivée, étape ignorée');
    logger.info({ jobId: job.id }, 'Summarise step skipped because summaries disabled');
    context.data.summary = null;
    return;
  }

  const transcription = context.data.transcription;
  if (!transcription) {
    await jobStore.appendLog(job.id, 'Transcription manquante, résumé ignoré', 'warn');
    logger.warn({ jobId: job.id }, 'Summarise step skipped due to missing transcription');
    context.data.summary = null;
    return;
  }

  await jobStore.appendLog(job.id, 'Génération du résumé (OpenAI)');
  const { provider, model, temperature, maxOutputTokens } = config.llm;
  logger.info(
    {
      jobId: job.id,
      templateId: template.id,
      participants: job.participants,
      llmConfig: { provider, model, temperature, maxOutputTokens },
    },
    'Summarise step started',
  );

  const summary = await services.openai.generateSummary({
    transcription,
    template,
    participants: job.participants,
    config: config.llm,
  });

  const markdown = typeof summary?.markdown === 'string' ? summary.markdown.trim() : '';

  if (!markdown) {
    // Les cas de non génération sont tracés pour faciliter le diagnostic côté utilisateur.
    const skippedMessage =
      summary?.reason === 'missing_api_key'
        ? "Résumé ignoré : clé API OpenAI manquante"
        : 'Résumé non généré par le service OpenAI';

    await jobStore.appendLog(job.id, skippedMessage, 'warn');
    logger.warn({ jobId: job.id, reason: summary?.reason ?? 'unknown' }, 'Summarise step did not produce content');
    context.data.summary = null;
    return;
  }

  context.data.summary = { markdown };
  logger.info({ jobId: job.id, markdownLength: markdown.length }, 'Summarise step completed');

  await jobStore.appendLog(job.id, 'Résumé généré');
}
