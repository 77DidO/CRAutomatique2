import { useEffect, useState } from 'react';

const DEFAULT_CONFIG = {
  llmProvider: 'mock',
  openaiApiKey: '',
  diarization: {
    enabled: true,
    speakerCount: 'auto'
  },
  pipeline: {
    transcription: true,
    summary: true,
    subtitles: true
  }
};

function mergeConfig(config) {
  const safeConfig = config && typeof config === 'object' ? config : {};

  return {
    ...DEFAULT_CONFIG,
    ...safeConfig,
    diarization: {
      ...DEFAULT_CONFIG.diarization,
      ...(safeConfig.diarization ?? {})
    },
    pipeline: {
      ...DEFAULT_CONFIG.pipeline,
      ...(safeConfig.pipeline ?? {})
    }
  };
}

export default function ConfigPanel({ config, onSave, loading }) {
  const [localConfig, setLocalConfig] = useState(mergeConfig(config));

  useEffect(() => {
    setLocalConfig(mergeConfig(config));
  }, [config]);

  const updateField = (path, value) => {
    setLocalConfig((current) => {
      const clone = typeof structuredClone === 'function'
        ? structuredClone
        : (input) => JSON.parse(JSON.stringify(input));
      const next = clone(current);
      let target = next;
      for (let i = 0; i < path.length - 1; i += 1) {
        target = target[path[i]];
      }
      target[path[path.length - 1]] = value;
      return next;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave?.(localConfig);
  };

  return (
    <form className="config-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="config-llm">Fournisseur LLM</label>
        <select
          id="config-llm"
          value={localConfig.llmProvider}
          onChange={(event) => updateField(['llmProvider'], event.target.value)}
        >
          <option value="mock">Simulation interne</option>
          <option value="openai">OpenAI</option>
          <option value="ollama">Ollama local</option>
        </select>
      </div>

      <fieldset>
        <legend>Diarisation</legend>
        <div className="field checkbox">
          <input
            id="config-diarization"
            type="checkbox"
            checked={localConfig.diarization.enabled}
            onChange={(event) => updateField(['diarization', 'enabled'], event.target.checked)}
          />
          <label htmlFor="config-diarization">Activer la séparation des locuteurs</label>
        </div>
        <div className="field">
          <label htmlFor="config-speakers">Nombre de locuteurs</label>
          <input
            id="config-speakers"
            type="text"
            value={localConfig.diarization.speakerCount}
            onChange={(event) => updateField(['diarization', 'speakerCount'], event.target.value)}
            placeholder="auto, 2, 3-5..."
          />
        </div>
      </fieldset>

      {localConfig.llmProvider === 'openai' && (
        <div className="field">
          <label htmlFor="config-openai-key">Clé API OpenAI</label>
          <input
            id="config-openai-key"
            type="password"
            value={localConfig.openaiApiKey ?? ''}
            onChange={(event) => updateField(['openaiApiKey'], event.target.value)}
            placeholder="sk-..."
            autoComplete="off"
          />
          <p className="helper">
            La clé est stockée côté serveur et sera utilisée lorsque le fournisseur OpenAI est sélectionné.
          </p>
        </div>
      )}

      <fieldset>
        <legend>Étapes du pipeline</legend>
        <div className="field checkbox">
          <input
            id="config-step-transcription"
            type="checkbox"
            checked={localConfig.pipeline.transcription}
            onChange={(event) => updateField(['pipeline', 'transcription'], event.target.checked)}
          />
          <label htmlFor="config-step-transcription">Transcription</label>
        </div>
        <div className="field checkbox">
          <input
            id="config-step-summary"
            type="checkbox"
            checked={localConfig.pipeline.summary}
            onChange={(event) => updateField(['pipeline', 'summary'], event.target.checked)}
          />
          <label htmlFor="config-step-summary">Synthèse Markdown</label>
        </div>
        <div className="field checkbox">
          <input
            id="config-step-subtitles"
            type="checkbox"
            checked={localConfig.pipeline.subtitles}
            onChange={(event) => updateField(['pipeline', 'subtitles'], event.target.checked)}
          />
          <label htmlFor="config-step-subtitles">Sous-titres VTT</label>
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {loading ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
        <button
          type="button"
          className="link"
          onClick={() => setLocalConfig(mergeConfig(config))}
          disabled={loading}
        >
          Réinitialiser
        </button>
      </div>
    </form>
  );
}
