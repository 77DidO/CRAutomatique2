const REQUIRED = [];

const OPTIONAL_WARNINGS = [
  { key: 'OPENAI_API_KEY', message: "OPENAI_API_KEY manquant : la génération de résumés échouera tant qu'une clé n'est pas fournie." },
];

export async function validateEnvironment({ logger, configStore } = {}) {
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
        if (logger && typeof logger.warn === 'function') {
          logger.warn({ err: error, key: warning.key }, message);
        } else {
          console.warn(message, error);
        }
      }
    }

    if (!hasValue) {
      if (logger && typeof logger.warn === 'function') {
        logger.warn({ key: warning.key }, warning.message);
      } else {
        console.warn(warning.message);
      }
    }
  }
}
