import path from 'node:path';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { ensureDirectory } from '../utils/fs.js';
import type { Environment, FfmpegService } from '../types/index.js';

export function createFfmpegService(environment: Environment): FfmpegService {
  if (environment.ffmpegBinary) {
    ffmpeg.setFfmpegPath(environment.ffmpegBinary);
  } else if ((ffmpegInstaller as unknown as { path?: string })?.path) {
    ffmpeg.setFfmpegPath((ffmpegInstaller as unknown as { path: string }).path);
  }

  return {
    async normalizeAudio({ input, output }) {
      ensureDirectory(path.dirname(output));
      await new Promise<void>((resolve, reject) => {
        const timeout = 180000; // 3 minutes timeout
        const timer = setTimeout(() => {
          reject(new Error(`Conversion audio arrêtée après ${timeout}ms`));
        }, timeout);

        ffmpeg(input)
          .audioChannels(1)
          .audioFrequency(16000)
          .format('wav')
          .on('error', (error) => {
            clearTimeout(timer);
            reject(error);
          })
          .on('end', () => {
            clearTimeout(timer);
            resolve();
          })
          .save(output);
      });
    },
  };
}
