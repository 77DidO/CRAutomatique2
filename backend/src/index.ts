import { createServer } from './server.js';

async function main(): Promise<void> {
  const server = await createServer();
  const port = Number(process.env.PORT ?? 4000);

  await server.start(port);
}

main().catch((err) => {
  console.error('Fatal error during startup', err);
  process.exit(1);
});
