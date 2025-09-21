import OpenAI from 'openai';

export function createOpenAiService({ configStore, logger }) {
  return {
    async generateSummary({ transcription, template, participants, config }) {
      const apiKey = process.env.OPENAI_API_KEY || (await configStore.read()).llm?.apiKey;
      if (!apiKey) {
        if (logger && typeof logger.warn === 'function') {
          logger.warn({ reason: 'missing_api_key' }, 'OpenAI API key missing, skipping summary generation');
        }
        return { markdown: null, reason: 'missing_api_key' };
      }

      const client = new OpenAI({ apiKey });

      const prompt = buildPrompt({ transcription, template, participants });

      const response = await client.chat.completions.create({
        model: config.model,
        temperature: config.temperature ?? 0.2,
        messages: [
          { role: 'system', content: 'Tu es un assistant qui produit des résumés détaillés et structurés.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: config.maxOutputTokens ?? 1200,
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Réponse OpenAI vide');
      }

      return { markdown: content.trim() };
    },
  };
}

function buildPrompt({ transcription, template, participants }) {
  const participantBlock = participants.length
    ? `Participants impliqués : ${participants.join(', ')}.`
    : 'Participants non identifiés.';
  return `${template.prompt}\n\n${participantBlock}\n\nTranscription :\n${transcription.text}`;
}
