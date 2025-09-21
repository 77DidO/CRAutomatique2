const REQUIRED = [];

const OPTIONAL_WARNINGS = [
  { key: 'OPENAI_API_KEY', message: "OPENAI_API_KEY manquant : la génération de résumés échouera tant qu'une clé n'est pas fournie." },
];

export function validateEnvironment(logger) {
  for (const key of REQUIRED) {
    if (!process.env[key]) {
      throw new Error(`Variable d'environnement obligatoire manquante : ${key}`);
    }
  }

  for (const warning of OPTIONAL_WARNINGS) {
    if (!process.env[warning.key]) {
      logger.warn({ key: warning.key }, warning.message);
    }
  }
}
