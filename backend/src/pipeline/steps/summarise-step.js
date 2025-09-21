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

  context.data.summary = summary;

  await jobStore.appendLog(job.id, 'Résumé généré');
}
