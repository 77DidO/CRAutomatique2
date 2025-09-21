import type { ConfigStore, Logger } from '../types/index.js';

const REQUIRED: string[] = [];

const OPTIONAL_WARNINGS: Array<{ key: string; message: string }> = [
  { key: 'OPENAI_API_KEY', message: "OPENAI_API_KEY manquant : la génération de résumés échouera tant qu'une clé n'est pas fournie." },
];

interface ValidateEnvironmentOptions {
  logger?: Logger;
  configStore?: ConfigStore;
}

export async function validateEnvironment({ logger, configStore }: ValidateEnvironmentOptions = {}): Promise<void> {
  for (const key of REQUIRED) {
    if (!process.env[key]) {
      throw new Error(`Variable d'environnement obligatoire manquante : ${key}`);
    }
  }

  for (const warning of OPTIONAL_WARNINGS) {
    let hasValue = Boolean(process.env[warning.key]);

    if (!hasValue && warning.key === 'OPENAI_API_KEY' && configStore) {
      try {
        const config = await configStore.read();
        hasValue = Boolean(config?.llm?.apiKey);
      } catch (error) {
        const message = "Impossible de lire la configuration lors de la validation de l'environnement";
        if (logger) {
          logger.warn({ err: error, key: warning.key }, message);
        } else {
          console.warn(message, error);
        }
      }
    }

    if (!hasValue) {
      if (logger) {
        logger.warn({ key: warning.key }, warning.message);
      } else {
        console.warn(warning.message);
      }
    }
  }
}
