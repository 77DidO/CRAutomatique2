import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { ensureDirectory } from '../utils/fs.js';
import type {
  Environment,
  Logger,
  WhisperConfig,
  WhisperService,
  WhisperTranscriptionResult,
  WhisperTranscriptionSegment,
} from '../types/index.js';

interface CreateWhisperServiceOptions {
  logger: Logger;
}

async function validatePythonEnvironment(pythonPath: string, logger: Logger): Promise<void> {
  try {
    await runProcess(pythonPath, ["-c", "import sys; print(sys.executable)"], { cwd: process.cwd(), logger });
    await runProcess(pythonPath, ["-c", "import whisper; print(whisper.__version__)"], { cwd: process.cwd(), logger });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    throw new Error(`Environnement Python invalide: ${message}`);
  }
}

function calculateTimeout(filePath: string): number {
  // Get file size in MB
  const stats = fs.statSync(filePath);
  const fileSizeInMB = stats.size / (1024 * 1024);
  
  // Base timeout of 5 minutes (300000ms)
  // Add 1 minute per 100MB of file size
  const baseTimeout = 300000;
  const timeoutPerMB = (60000 / 100); // 1 minute per 100MB
  
  return Math.max(baseTimeout, baseTimeout + (fileSizeInMB * timeoutPerMB));
}

async function runProcess(
  command: string,
  args: string[],
  { cwd, logger, timeout }: { cwd: string; logger: Logger; timeout?: number }
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    logger.info({ command, args, cwd }, 'Démarrage du processus');
    
    const child = spawn(command, args, { cwd });
    let stdout = '';
    let stderr = '';

    const timer = timeout ? setTimeout(() => {
      child.kill();
      reject(new Error(`Processus arrêté après ${timeout}ms d'exécution`));
    }, timeout) : null;

    child.stdout.on('data', (chunk: unknown) => {
      const value = typeof chunk === 'string' ? chunk : String(chunk);
      stdout += value;
      logger.info({ chunk: value }, 'Sortie de la commande');
    });

    child.stderr.on('data', (chunk: unknown) => {
      const value = typeof chunk === 'string' ? chunk : String(chunk);
      stderr += value;
      // Don't log FP16 warning as it's expected behavior on CPU
      if (!value.includes("FP16 is not supported on CPU")) {
        logger.warn({ chunk: value }, 'Erreur de la commande');
      }
    });

    child.on('error', (error: Error) => {
      if (timer) clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code: number | null) => {
      if (timer) clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Processus terminé avec le code ${code}:\n${stderr}`));
        return;
      }
      logger.info(
        { stdout: stdout.substring(0, 500), stderr: stderr.substring(0, 500) },
        'Processus terminé avec succès'
      );
      resolve();
    });
  });
}

export function createWhisperService(environment: Environment, { logger }: CreateWhisperServiceOptions): WhisperService {
  const pythonPath = environment.whisperBinary || 
    process.env.WHISPER_PYTHON_PATH || 
    "python";

  validatePythonEnvironment(pythonPath, logger).catch(error => {
    logger.error({ error }, "Échec de validation de l'environnement Python");
  });

  return {
    async transcribe({ inputPath, outputDir, config }: { inputPath: string; outputDir: string; config: WhisperConfig }): Promise<WhisperTranscriptionResult> {
      ensureDirectory(outputDir);
      await validatePythonEnvironment(pythonPath, logger);

      const timeout = calculateTimeout(inputPath);
      logger.info({ timeout }, `Timeout calculé pour le fichier: ${timeout}ms`);

      const transcribeScript = `
import sys
import whisper
import os
import json
import torch

try:
    output_dir = r"${outputDir}"
    input_path = r"${inputPath}"
    
    # Detect if CUDA is available
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    # Load model with appropriate device and precision
    model = whisper.load_model(
        "${config.model || 'base'}", 
        device=device,
        # Only use fp16 if we're on CUDA
        fp16=(device == "cuda")
    )
    
    # Transcribe
    result = model.transcribe(
        input_path,
        verbose=True,
        language="${config.language || 'fr'}"
    )
    
    # Save results
    segments = []
    for segment in result["segments"]:
        segments.append({
            "id": segment["id"],
            "start": segment["start"],
            "end": segment["end"],
            "text": segment["text"].strip()
        })
    
    output = {
        "text": result["text"].strip(),
        "segments": segments,
        "language": result["language"]
    }
    
    with open(os.path.join(output_dir, "transcript.json"), "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(json.dumps(output))

except Exception as e:
    print(json.dumps({
        "error": str(e),
        "type": type(e).__name__
    }), file=sys.stderr)
    sys.exit(1)
`;

      const scriptPath = path.join(outputDir, 'transcribe.py');
      await fs.promises.writeFile(scriptPath, transcribeScript, 'utf-8');

      try {
        await runProcess(pythonPath, [scriptPath], { cwd: outputDir, logger, timeout });
        
        const transcriptPath = path.join(outputDir, 'transcript.json');
        const transcriptContent = await fs.promises.readFile(transcriptPath, 'utf-8');
        return JSON.parse(transcriptContent) as WhisperTranscriptionResult;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        throw new Error(`Erreur lors de la transcription: ${message}`);
      }
    }
  };
}