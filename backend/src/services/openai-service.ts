import type {
  ConfigStore,
  LlmConfig,
  Logger,
  OpenAiService,
  SummaryResult,
  Template,
  WhisperTranscriptionResult,
} from '../types/index.js';

interface CreateOpenAiServiceOptions {
  configStore: ConfigStore;
  logger: Logger;
}

interface GenerateSummaryArgs {
  transcription: WhisperTranscriptionResult;
  template: Template;
  participants: string[];
  config: LlmConfig;
}

export function createOpenAiService({ configStore, logger }: CreateOpenAiServiceOptions): OpenAiService {
  return {
    async generateSummary({ transcription, template, participants, config }: GenerateSummaryArgs): Promise<SummaryResult> {
      const rawApiKey = process.env.OPENAI_API_KEY || (await configStore.read()).llm?.apiKey;
      const apiKey = sanitiseApiKey(rawApiKey);

      if (!apiKey) {
        logger.warn({ reason: 'missing_api_key' }, 'OpenAI API key missing, skipping summary generation');
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

function buildPrompt({ transcription, template, participants }: {
  transcription: WhisperTranscriptionResult;
  template: Template;
  participants: string[];
}): string {
  const participantBlock = participants.length
    ? `Participants impliqués : ${participants.join(', ')}.`
    : 'Participants non identifiés.';
  return `${template.prompt}\n\n${participantBlock}\n\nTranscription :\n${transcription.text}`;
}

function sanitiseApiKey(value: unknown): string {
  if (typeof value !== 'string') return '';
  let trimmed = value.trim();

  if (!trimmed) return '';

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

let openAiCtorPromise: Promise<OpenAiConstructor> | undefined;

type OpenAiConstructor = new (args: { apiKey: string }) => {
  chat: {
    completions: {
      create(input: {
        model: string;
        temperature?: number;
        messages: { role: 'system' | 'user'; content: string }[];
        max_tokens?: number;
      }): Promise<{ choices?: { message?: { content?: string } }[] }>;
    };
  };
};

async function loadOpenAi(): Promise<OpenAiConstructor> {
  if (!openAiCtorPromise) {
    openAiCtorPromise = import('openai').then((module) => {
      const mod = module as unknown as { default?: OpenAiConstructor; OpenAI?: OpenAiConstructor };
      return mod.default ?? mod.OpenAI ?? (module as unknown as OpenAiConstructor);
    });
  }
  return openAiCtorPromise;
}
