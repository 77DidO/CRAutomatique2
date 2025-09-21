export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface Logger {
  info(payload: unknown, message?: string): void;
  error(payload: unknown, message?: string): void;
  warn(payload: unknown, message?: string): void;
  debug(payload: unknown, message?: string): void;
}

export interface Environment {
  rootDir: string;
  jobsDir: string;
  uploadsDir: string;
  tmpDir: string;
  configFile: string;
  templatesFile: string;
  jobsFile: string;
  whisperBinary: string | null;
  ffmpegBinary: string | null;
}

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface JobOutput {
  label: string;
  filename: string;
  mimeType: string;
}

export interface Job {
  id: string;
  filename: string;
  templateId: string | null;
  participants: string[];
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  progress: number;
  outputs: JobOutput[];
}

export interface JobLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

export interface JobsFilePayload {
  jobs: Job[];
  logs: Record<string, JobLogEntry[]>;
}

export interface WhisperConfig {
  model: string;
  language: string | null;
  computeType: string;
  batchSize: number;
  vad: boolean;
  chunkDuration: number;
}

export interface LlmConfig {
  provider: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  apiKey?: string | null;
}

export interface PipelineConfig {
  enableSummaries: boolean;
  enableSubtitles: boolean;
}

export interface AppConfig {
  whisper: WhisperConfig;
  llm: LlmConfig;
  pipeline: PipelineConfig;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

export type TemplateInput = Partial<Omit<Template, 'id'>> & Pick<Template, 'prompt' | 'name'> & { id?: string };

export interface WhisperTranscriptionSegment {
  start?: number;
  end?: number;
  text?: string;
}

export interface WhisperTranscriptionResult {
  model: string;
  text: string;
  segments?: WhisperTranscriptionSegment[];
  language?: string | null;
}

export interface SummaryResult {
  markdown: string | null;
  reason?: string;
}

export interface WhisperService {
  transcribe(args: { inputPath: string; outputDir: string; config: WhisperConfig }): Promise<WhisperTranscriptionResult>;
}

export interface FfmpegService {
  normalizeAudio(args: { input: string; output: string }): Promise<void>;
}

export interface OpenAiService {
  generateSummary(args: {
    transcription: WhisperTranscriptionResult;
    template: Template;
    participants: string[];
    config: LlmConfig;
  }): Promise<SummaryResult>;
}

export interface JobStore {
  initialise(): Promise<void>;
  list(): Promise<Job[]>;
  get(id: string): Promise<Job | null>;
  create(args: { filename: string; tempPath: string; templateId: string | null; participants: string[] }): Promise<Job>;
  update(id: string, updates: Partial<Job>): Promise<Job>;
  appendLog(id: string, message: string, level?: LogLevel): Promise<JobLogEntry>;
  getLogs(id: string): Promise<JobLogEntry[]>;
  addOutput(id: string, output: JobOutput): Promise<Job>;
  remove(id: string): Promise<void>;
}

export interface ConfigStore {
  initialise(): Promise<void>;
  read(): Promise<AppConfig>;
  write(patch: DeepPartial<AppConfig>): Promise<AppConfig>;
}

export interface TemplateStore {
  initialise(): Promise<void>;
  list(): Promise<Template[]>;
  create(payload: TemplateInput): Promise<Template>;
  update(id: string, payload: TemplateInput): Promise<Template>;
  remove(id: string): Promise<void>;
}

export type Services = {
  whisper: WhisperService;
  ffmpeg: FfmpegService;
  openai: OpenAiService;
};

export interface PipelineData {
  preparedPath?: string;
  transcription?: WhisperTranscriptionResult;
  summary?: SummaryResult | null;
  outputs?: JobOutput[];
}

export interface PipelineContext {
  job: Job;
  config: AppConfig;
  template: Template;
  environment: Environment;
  services: Services;
  jobStore: JobStore;
  data: PipelineData;
}

export type PipelineStep = (context: PipelineContext) => Promise<void>;

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<U>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export interface HttpError extends Error {
  status?: number;
  details?: unknown;
}
