import OpenAI from 'openai';

function buildSystemPrompt(template) {
  if (template?.prompt) {
    return `Tu es un assistant qui produit des comptes rendus structurés. Utilise le gabarit suivant : ${template.prompt}`;
  }
  return 'Tu es un assistant spécialisé dans la rédaction de comptes rendus clairs et concis en français.';
}

function buildUserPrompt({ job, transcription, template }) {
  const participantList = Array.isArray(job.participants) && job.participants.length > 0
    ? job.participants.map((participant) => `- ${participant}`).join('\n')
    : '- Aucun participant renseigné';

  const instructions = template?.prompt
    ? `${template.prompt}\n\n`
    : '';

  return [
    `Titre : ${job.title}`,
    `Participants :\n${participantList}`,
    instructions,
    'Transcription complète :',
    transcription.text
  ].join('\n\n');
}

export const summariesStep = {
  async execute({ jobId, jobStore, templateStore, config, context, logger }) {
    const pipelineConfig = config?.pipeline ?? {};
    if (pipelineConfig.summary === false) {
      logger.warn('Étape de synthèse désactivée via la configuration.');
      context.summary = { ...context.summary, skipped: true, reason: 'summary-disabled' };
      return;
    }

    const provider = typeof config?.llmProvider === 'string'
      ? config.llmProvider.toLowerCase()
      : 'mock';

    if (provider !== 'openai') {
      logger.warn('Fournisseur LLM inactif ou différent d\'OpenAI, synthèse ignorée.');
      context.summary = { ...context.summary, skipped: true, reason: 'llm-provider-disabled' };
      return;
    }

    const transcription = context.transcription ?? {};
    if (!transcription.text) {
      logger.warn('Synthèse ignorée : aucune transcription disponible.');
      context.summary = { ...context.summary, skipped: true, reason: 'missing-transcription' };
      return;
    }

    const job = jobStore.get(jobId);
    if (!job) {
      throw new Error('Job introuvable pour la génération de synthèse.');
    }

    const template = context.template
      || templateStore.getById(job.template ?? '')
      || null;

    const apiKey = (config?.openaiApiKey
      ?? config?.llmApiToken
      ?? config?.openai?.apiKey
      ?? process.env.OPENAI_API_KEY
      ?? '').trim();

    if (!apiKey) {
      throw new Error('Clé API OpenAI manquante pour générer la synthèse.');
    }

    const chatModel = (config?.openai?.chatModel ?? config?.chatModel ?? 'gpt-4o-mini').trim();
    const temperature = typeof config?.openai?.temperature === 'number'
      ? config.openai.temperature
      : 0.7;

    const client = new OpenAI({ apiKey });

    logger.info('Demande de synthèse envoyée au LLM.', { model: chatModel, temperature });

    // Compose a lightweight prompt to avoid leaking implementation details to the LLM.
    const messages = [
      { role: 'system', content: buildSystemPrompt(template) },
      {
        role: 'user',
        content: buildUserPrompt({ job, transcription, template })
      }
    ];

    const completion = await client.chat.completions.create({
      model: chatModel,
      temperature,
      messages
    });

    const summaryContent = completion?.choices?.[0]?.message?.content?.trim();

    if (!summaryContent) {
      throw new Error('Le LLM n\'a retourné aucun contenu pour la synthèse.');
    }

    context.summary = {
      markdown: summaryContent,
      skipped: false,
      reason: null
    };
    context.template = template;

    await jobStore.appendLog(jobId, 'Synthèse générée via OpenAI.');
    logger.info('Synthèse générée.', { characters: summaryContent.length });
  }
};
