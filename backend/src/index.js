import { createApp } from './app.js';
import { ensureDataEnvironment } from './config/environment.js';
import { JobStore } from './storage/jobStore.js';
import { ConfigStore } from './storage/configStore.js';
import { TemplateStore } from './storage/templateStore.js';

async function bootstrap() {
  await ensureDataEnvironment();

  const jobStore = new JobStore();
  const configStore = new ConfigStore();
  const templateStore = new TemplateStore();

  await Promise.all([
    jobStore.init(),
    configStore.init(),
    templateStore.init()
  ]);

  await Promise.all(jobStore.list().map((job) => jobStore.ensureJobDirectory(job.id)));

  const app = createApp({ jobStore, configStore, templateStore });
  const port = Number.parseInt(process.env.PORT ?? '4000', 10);

  app.listen(port, () => {
    console.log(`Backend prêt sur le port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Impossible de démarrer le serveur :', error);
  process.exit(1);
});
