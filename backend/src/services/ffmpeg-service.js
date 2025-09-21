import path from 'node:path';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { ensureDirectory } from '../utils/fs.js';

export function createFfmpegService(environment, { logger }) {
  if (environment.ffmpegBinary) {
    ffmpeg.setFfmpegPath(environment.ffmpegBinary);
  } else if (ffmpegInstaller?.path) {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  }

  return {
    async normalizeAudio({ input, output }) {
      ensureDirectory(path.dirname(output));
      return new Promise((resolve, reject) => {
        ffmpeg(input)
          .audioChannels(1)
          .audioFrequency(16000)
          .format('wav')
          .on('error', reject)
          .on('end', resolve)
          .save(output);
      });
    },
  };
}
