export async function summariseStep(context) {
  const { job, config, template, services, jobStore } = context;

  if (!config.pipeline.enableSummaries) {
    await jobStore.appendLog(job.id, 'Synthèse LLM désactivée, étape ignorée');
    context.data.summary = null;
    return;
  }

  await jobStore.appendLog(job.id, 'Génération du résumé (OpenAI)');

  const summary = await services.openai.generateSummary({
    transcription: context.data.transcription,
    template,
    participants: job.participants,
    config: config.llm,
  });

  const markdown = typeof summary?.markdown === 'string' ? summary.markdown.trim() : '';

  if (!markdown) {
    const skippedMessage =
      summary?.reason === 'missing_api_key'
        ? "Résumé ignoré : clé API OpenAI manquante"
        : 'Résumé non généré par le service OpenAI';

    await jobStore.appendLog(job.id, skippedMessage, 'warn');
    context.data.summary = null;
    return;
  }

  context.data.summary = { markdown };

  await jobStore.appendLog(job.id, 'Résumé généré');
}
