import fs from 'node:fs';
import path from 'node:path';

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
