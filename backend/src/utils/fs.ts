import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function ensureFile(filePath: string, defaultContent = '{}'): void {
  ensureDirectory(path.dirname(filePath));
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, defaultContent);
  }
}

export async function removeDirectory(
  dirPath: string,
  options: { retries?: number; delayMs?: number } = {},
): Promise<void> {
  const { retries = 3, delayMs = 250 } = options;

  try {
    await fs.promises.access(dirPath, fs.constants.F_OK);
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await fs.promises.rm(dirPath, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      await delay(delayMs * attempt);
    }
  }
}
