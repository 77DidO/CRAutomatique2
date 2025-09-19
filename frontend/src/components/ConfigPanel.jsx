import { useEffect, useState } from 'react';

const DEFAULT_CONFIG = {
  llmProvider: 'mock',
  llmApiToken: '',
  openaiApiKey: '',
  diarization: {
    enabled: true,
    speakerCount: 'auto'
  },
  whisper: {
    model: 'whisper-1',
    language: 'auto',
    translate: false,
    temperature: 0.2
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
    whisper: {
      ...DEFAULT_CONFIG.whisper,
      ...(safeConfig.whisper ?? {})
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
      const clone =
        typeof structuredClone === 'function'
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
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="form-field">
        <label className="form-label" htmlFor="config-llm">
          Fournisseur LLM
        </label>
        <select
          id="config-llm"
          className="select select-bordered"
          value={localConfig.llmProvider}
          onChange={(event) => updateField(['llmProvider'], event.target.value)}
        >
          <option value="mock">Simulation interne</option>
          <option value="openai">OpenAI</option>
          <option value="ollama">Ollama local</option>
        </select>
      </div>

      <section className="bg-base-200/60 rounded-xl p-4 space-y-6">
        <h3 className="section-title m-0">Diarisation</h3>
        <label className="flex items-center gap-3">
          <input
            id="config-diarization"
            type="checkbox"
            className="toggle toggle-primary"
            checked={localConfig.diarization.enabled}
            onChange={(event) => updateField(['diarization', 'enabled'], event.target.checked)}
          />
          <span className="font-medium text-base-content">Activer la séparation des locuteurs</span>
        </label>
        <div className="form-field">
          <label className="form-label" htmlFor="config-speakers">
            Nombre de locuteurs
          </label>
          <input
            id="config-speakers"
            className="input input-bordered"
            type="text"
            value={localConfig.diarization.speakerCount}
            onChange={(event) => updateField(['diarization', 'speakerCount'], event.target.value)}
            placeholder="auto, 2, 3-5..."
          />
        </div>
      </section>

      {localConfig.llmProvider === 'openai' && (
        <div className="form-field">
          <label className="form-label" htmlFor="config-openai-key">
            Clé API OpenAI
          </label>
          <input
            id="config-openai-key"
            className="input input-bordered"
            type="password"
            value={localConfig.openaiApiKey ?? ''}
            onChange={(event) => updateField(['openaiApiKey'], event.target.value)}
            placeholder="sk-..."
            autoComplete="off"
          />
          <p className="form-helper">
            La clé est stockée côté serveur et sera utilisée lorsque le fournisseur OpenAI est sélectionné.
          </p>
        </div>
      )}

      {localConfig.llmProvider !== 'mock' && (
        <div className="form-field">
          <label className="form-label" htmlFor="config-llm-token">
            Token du fournisseur IA
          </label>
          <input
            id="config-llm-token"
            className="input input-bordered"
            type="password"
            value={localConfig.llmApiToken ?? ''}
            onChange={(event) => updateField(['llmApiToken'], event.target.value)}
            placeholder="Token ou clé spécifique au fournisseur"
            autoComplete="off"
          />
          <p className="form-helper">
            Ce champ permet de stocker en toute sécurité le jeton requis par le fournisseur sélectionné.
          </p>
        </div>
      )}

      <section className="bg-base-200/60 rounded-xl p-4 space-y-6">
        <h3 className="section-title m-0">Étapes du pipeline</h3>
        <label className="flex items-center gap-3">
          <input
            id="config-step-transcription"
            type="checkbox"
            className="toggle toggle-primary"
            checked={localConfig.pipeline.transcription}
            onChange={(event) => updateField(['pipeline', 'transcription'], event.target.checked)}
          />
          <span className="font-medium text-base-content">Transcription</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            id="config-step-summary"
            type="checkbox"
            className="toggle toggle-primary"
            checked={localConfig.pipeline.summary}
            onChange={(event) => updateField(['pipeline', 'summary'], event.target.checked)}
          />
          <span className="font-medium text-base-content">Synthèse Markdown</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            id="config-step-subtitles"
            type="checkbox"
            className="toggle toggle-primary"
            checked={localConfig.pipeline.subtitles}
            onChange={(event) => updateField(['pipeline', 'subtitles'], event.target.checked)}
          />
          <span className="font-medium text-base-content">Sous-titres VTT</span>
        </label>
      </section>

      <section className="bg-base-200/60 rounded-xl p-4 space-y-6">
        <h3 className="section-title m-0">Options Whisper</h3>
        <div className="form-field">
          <label className="form-label" htmlFor="config-whisper-model">
            Modèle
          </label>
          <select
            id="config-whisper-model"
            className="select select-bordered"
            value={localConfig.whisper.model}
            onChange={(event) => updateField(['whisper', 'model'], event.target.value)}
          >
            <option value="whisper-1">whisper-1</option>
            <option value="gpt-4o-mini-transcribe">gpt-4o-mini-transcribe</option>
            <option value="whisper-large-v3">whisper-large-v3</option>
          </select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="config-whisper-language">
            Langue forcée
          </label>
          <input
            id="config-whisper-language"
            className="input input-bordered"
            type="text"
            value={localConfig.whisper.language}
            onChange={(event) => updateField(['whisper', 'language'], event.target.value)}
            placeholder="auto, fr, en..."
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="config-whisper-temperature">
            Température
          </label>
          <input
            id="config-whisper-temperature"
            className="input input-bordered"
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={localConfig.whisper.temperature}
            onChange={(event) =>
              updateField(
                ['whisper', 'temperature'],
                Number.parseFloat(event.target.value) || 0
              )
            }
          />
          <p className="form-helper">
            Ajustez la créativité du modèle : 0 pour des résultats déterministes, 1 pour plus de variété.
          </p>
        </div>
        <label className="flex items-center gap-3">
          <input
            id="config-whisper-translate"
            type="checkbox"
            className="toggle toggle-primary"
            checked={localConfig.whisper.translate}
            onChange={(event) => updateField(['whisper', 'translate'], event.target.checked)}
          />
          <span className="font-medium text-base-content">Traduire automatiquement vers l'anglais</span>
        </label>
      </section>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-md" disabled={loading}>
          {loading ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-md"
          onClick={() => setLocalConfig(mergeConfig(config))}
          disabled={loading}
        >
          Réinitialiser
        </button>
      </div>
    </form>
  );
}
