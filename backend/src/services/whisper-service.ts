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
    // First check if Python exists and print its path
    await runProcess(pythonPath, ["-c", "import sys; print(f'Using Python: {sys.executable}')"], { cwd: process.cwd(), logger });
    
    // Then check if we can import whisper and verify it's using the correct environment
    const checkScript = "import whisper; print(f'Whisper version: {whisper.__version__}')";
    await runProcess(pythonPath, ["-c", checkScript], { cwd: process.cwd(), logger });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    throw new Error(`Environnement Python invalide: ${message}`);
  }
}

async function runProcess(
  command: string,
  args: string[],
  { cwd, logger, timeout = 300000 }: { cwd: string; logger: Logger; timeout?: number }
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    logger.info({ command, args, cwd }, 'Démarrage du processus');
    
    const child = spawn(command, args, { cwd });
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Processus arrêté après ${timeout}ms d'exécution`));
    }, timeout);

    child.stdout.on('data', (chunk: unknown) => {
      const value = typeof chunk === 'string' ? chunk : String(chunk);
      stdout += value;
      logger.info({ chunk: value }, 'Sortie de la commande');
    });

    child.stderr.on('data', (chunk: unknown) => {
      const value = typeof chunk === 'string' ? chunk : String(chunk);
      stderr += value;
      logger.warn({ chunk: value }, 'Erreur de la commande');
    });

    child.on('error', (error: Error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code: number | null) => {
      clearTimeout(timer);
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
  // Use absolute path to the virtual environment's Python
  const pythonPath = environment.whisperBinary || 
    process.env.WHISPER_PYTHON_PATH || 
    path.resolve(process.cwd(), '.venv', 'Scripts', 'python.exe');

  validatePythonEnvironment(pythonPath, logger).catch(error => {
    logger.error({ error }, "Échec de validation de l'environnement Python");
  });

  return {
    async transcribe({ inputPath, outputDir, config }: { inputPath: string; outputDir: string; config: WhisperConfig }): Promise<WhisperTranscriptionResult> {
      ensureDirectory(outputDir);
      await validatePythonEnvironment(pythonPath, logger);

      // Augmenter le timeout pour la transcription (30 minutes)
      const transcriptionTimeout = 30 * 60 * 1000;
      logger.info({ timeout: transcriptionTimeout }, 'Configuration du timeout de transcription');

      const transcribeScript = `
import sys
import whisper
import os
import json
import torch
import numpy as np
from optimum.intel import OVModelForSpeechSeq2Seq
from transformers import AutoProcessor, WhisperProcessor
from pathlib import Path

# Configure paths
home_dir = Path.home()
ffmpeg_path = str(home_dir / "scoop" / "apps" / "ffmpeg" / "current" / "bin")

# Set environment variables
os.environ["PATH"] = os.pathsep.join([ffmpeg_path, os.environ.get("PATH", "")])
os.environ["PYTHONPATH"] = os.pathsep.join([
    os.path.dirname(os.path.dirname(sys.executable)),
    os.environ.get("PYTHONPATH", "")
])

# Debug info
print(f"Python executable: {sys.executable}")
print(f"PYTHONPATH: {os.environ.get('PYTHONPATH', '')}")
print(f"PATH: {os.environ.get('PATH', '')}")
print(f"FFmpeg path exists: {os.path.exists(ffmpeg_path)}")

try:
    output_dir = r"${outputDir}"
    input_path = r"${inputPath}"

    print(f"Démarrage de la transcription : {input_path}")
    print(f"Dossier de sortie : {output_dir}")

    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    # Load model with appropriate settings
    # Initialize OpenVINO for better CPU performance
    print("Initializing OpenVINO optimized model...")
    model_name = "${config.model}"
    model_id = f"openai/whisper-{model_name}"
    print(f"Loading model: {model_id}")
    ov_model = OVModelForSpeechSeq2Seq.from_pretrained(model_id, export=True)
    processor = AutoProcessor.from_pretrained(model_id)
    
    # Set OpenVINO backend options for better performance
    ov_model.half()  # Use FP16 for better performance
    ov_model.set_providers(["CPUExecutionProvider"])
    
    # Load audio file
    print(f"Processing audio file: {input_path}")
    audio_input = whisper.load_audio(input_path)
    
    # Process audio with OpenVINO optimized model
    inputs = processor(audio_input, return_tensors="pt", sampling_rate=16000)
    
    print("Starting transcription...")
    generated_ids = ov_model.generate(
        inputs["input_features"],
        language="${config.language || 'fr'}",
        task="transcribe",
        return_timestamps=True
    )
    
    # Decode the generated IDs to text
    transcription = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    
    # Prepare the result dictionary
    result = {
        "text": transcription,
        "segments": [],
        "language": "${config.language || 'fr'}"
    }

    # Clean up any previous model to free memory
    if 'last_model' in globals():
        del globals()['last_model']
        import gc
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    # Store current model for future cleanup
    globals()['last_model'] = model

    # Transcribe with explicit parameters
    result = model.transcribe(
        input_path,
        language="${config.language || 'fr'}",
        verbose=True,
        task="transcribe",
        temperature=0,
        best_of=1,
        beam_size=1
    )

    # Sauvegarder en JSON
    json_path = os.path.join(output_dir, "transcription.json")
    print(f"Sauvegarde JSON vers : {json_path}")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    # Sauvegarder en texte brut
    txt_path = os.path.join(output_dir, "transcription.txt")
    print(f"Sauvegarde TXT vers : {txt_path}")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(result["text"])

    print("Transcription terminée avec succès")
except Exception as e:
    print(f"Erreur lors de la transcription : {str(e)}", file=sys.stderr)
    raise
`;

      const scriptPath = path.join(outputDir, "_transcribe.py");
      await fs.promises.writeFile(scriptPath, transcribeScript);

      await runProcess(pythonPath, [scriptPath], { cwd: outputDir, logger, timeout: transcriptionTimeout });

      const jsonPath = path.join(outputDir, 'transcription.json');
      const textPath = path.join(outputDir, 'transcription.txt');

      logger.info({ jsonPath, textPath }, 'Vérification des fichiers de sortie');

      if (!fs.existsSync(jsonPath) || !fs.existsSync(textPath)) {
        throw new Error(`Les fichiers de sortie n'ont pas été créés : ${jsonPath} ou ${textPath} manquant`);
      }

      const result = JSON.parse(await fs.promises.readFile(jsonPath, 'utf8'));
      const text = await fs.promises.readFile(textPath, 'utf8');

      return {
        model: config.model,
        text,
        segments: result.segments || [],
        language: result.language || config.language || null,
      };
    },
  };
}