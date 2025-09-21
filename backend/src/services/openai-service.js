export function createOpenAiService({ configStore, logger }) {
  return {
    async generateSummary({ transcription, template, participants, config }) {
      const rawApiKey = process.env.OPENAI_API_KEY || (await configStore.read()).llm?.apiKey;
      const apiKey = sanitiseApiKey(rawApiKey);

      if (!apiKey) {
        if (logger && typeof logger.warn === 'function') {
          logger.warn({ reason: 'missing_api_key' }, 'OpenAI API key missing, skipping summary generation');
        }
        return { markdown: null, reason: 'missing_api_key' };
      }

      const OpenAI = await loadOpenAi();
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

function sanitiseApiKey(value) {
  if (typeof value !== 'string') return value;
  let trimmed = value.trim();

  if (!trimmed) return '';

  // Strip surrounding quotes that may originate from shell exports or .env files.
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  if (!trimmed) return '';

  const normalised = trimmed.toLowerCase();
  const placeholderKeys = new Set(['sk-replace-me']);
  if (placeholderKeys.has(normalised)) {
    return '';
  }

  return trimmed;
}

let openAiCtorPromise;

async function loadOpenAi() {
  if (!openAiCtorPromise) {
    openAiCtorPromise = import('openai').then((module) => module.default ?? module.OpenAI ?? module);
  }
  return openAiCtorPromise;
}
