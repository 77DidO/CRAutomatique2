export function createWorkflowContext({ jobId, config, template }) {
  return {
    jobId,
    config: config ?? {},
    template: template ?? null,
    preparedSourcePath: null,
    transcription: {
      text: '',
      segments: [],
      model: null,
      raw: null
    },
    subtitles: {
      vtt: ''
    },
    summary: {
      markdown: '',
      skipped: false,
      reason: null
    },
    metadata: {
      startedAt: new Date().toISOString()
    }
  };
}
