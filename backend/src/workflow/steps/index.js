import { ingestStep } from './ingest.js';
import { transcribeStep } from './transcribe.js';
import { cleanupStep } from './cleanup.js';
import { summariesStep } from './summaries.js';

export const stepHandlers = {
  ingest: ingestStep,
  transcription: transcribeStep,
  cleanup: cleanupStep,
  summaries: summariesStep
};
