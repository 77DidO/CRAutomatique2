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
        ffmpeg(input)
          .audioChannels(1)
          .audioFrequency(16000)
          .format('wav')
          .on('error', (error) => reject(error))
          .on('end', () => resolve())
          .save(output);
      });
    },
  };
}
