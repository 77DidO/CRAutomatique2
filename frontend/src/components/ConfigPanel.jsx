import React, { useEffect, useState } from 'react';
import '../styles/config-panel.css';

const computeTypes = ['auto', 'int8', 'float32'];

const whisperModels = [
  {
    name: 'tiny',
    description: 'Le plus rapide, qualité basique',
    multilingual: true,
    sizeInMemory: '~1 GB',
    relativeDuration: '~32x plus rapide que temps réel'
  },
  {
    name: 'base',
    description: 'Rapide, qualité correcte',
    multilingual: true,
    sizeInMemory: '~1 GB',
    relativeDuration: '~16x plus rapide que temps réel'
  },
  {
    name: 'small',
    description: 'Équilibre vitesse/qualité',
    multilingual: true,
    sizeInMemory: '~2 GB',
    relativeDuration: '~6x plus rapide que temps réel'
  },
  {
    name: 'medium',
    description: 'Haute qualité, plus lent',
    multilingual: true,
    sizeInMemory: '~5 GB',
    relativeDuration: '~2x plus rapide que temps réel'
  },
  {
    name: 'large-v3',
    description: 'Meilleure qualité possible',
    multilingual: true,
    sizeInMemory: '~10 GB',
    relativeDuration: '~1x temps réel'
  }
];

export default function ConfigPanel({ config, onSave }) {
  const [localConfig, setLocalConfig] = useState(config);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [clearApiKey, setClearApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
    setApiKeyInput('');
    setClearApiKey(false);
  }, [config]);

  const updateSection = (path, value) => {
    setLocalConfig((prev) => {
      const next = typeof structuredClone === 'function'
        ? structuredClone(prev)
        : JSON.parse(JSON.stringify(prev));
      let cursor = next;
      const lastKey = path[path.length - 1];
      for (const key of path.slice(0, -1)) {
        cursor[key] = { ...cursor[key] };
        cursor = cursor[key];
      }
      cursor[lastKey] = value;
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payload = typeof structuredClone === 'function'
        ? structuredClone(localConfig)
        : JSON.parse(JSON.stringify(localConfig));

      if (payload.llm) {
        delete payload.llm.hasApiKey;

        const trimmedApiKey = apiKeyInput.trim();

        if (trimmedApiKey.length > 0) {
          payload.llm.apiKey = trimmedApiKey;
        } else if (clearApiKey) {
          payload.llm.apiKey = null;
        } else {
          delete payload.llm.apiKey;
        }
      }

      await onSave(payload);
      setSuccess(true);
      setApiKeyInput('');
      setClearApiKey(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasStoredApiKey = Boolean(localConfig.llm?.hasApiKey);

  const toggleClearApiKey = () => {
    setApiKeyInput('');
    setClearApiKey((prev) => !prev);
  };

  return (
    <section className="surface-card space-y-6">
      <h2 className="section-title">Configuration du pipeline</h2>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <fieldset className="space-y-6">
          <legend>Whisper local</legend>
          <div className="form-field">
            <label className="form-label" htmlFor="whisper-model">
              Modèle
            </label>
            <select
              id="whisper-model"
              className="select select-bordered"
              value={localConfig.whisper.model}
              onChange={(event) => updateSection(['whisper', 'model'], event.target.value)}
            >
              {whisperModels.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name} - {model.description}
                </option>
              ))}
            </select>
            <p className="form-helper">
              {whisperModels.find((m) => m.name === localConfig.whisper.model)?.relativeDuration}
              {' • '}
              {whisperModels.find((m) => m.name === localConfig.whisper.model)?.sizeInMemory} de mémoire requise
            </p>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="whisper-language">
              Langue (optionnel)
            </label>
            <input
              id="whisper-language"
              className="input input-bordered"
              value={localConfig.whisper.language ?? ''}
              onChange={(event) => updateSection(['whisper', 'language'], event.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="whisper-compute">
              Type de calcul
            </label>
            <select
              id="whisper-compute"
              className="select select-bordered"
              value={localConfig.whisper.computeType}
              onChange={(event) => updateSection(['whisper', 'computeType'], event.target.value)}
            >
              {computeTypes.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="whisper-batch">
              Taille de batch
            </label>
            <input
              id="whisper-batch"
              className="input input-bordered"
              type="number"
              min="0"
              value={localConfig.whisper.batchSize ?? 0}
              onChange={(event) => updateSection(['whisper', 'batchSize'], Number(event.target.value))}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-6">
          <legend>OpenAI</legend>
          <div className="form-field">
            <label className="form-label" htmlFor="llm-model">
              Modèle
            </label>
            <input
              id="llm-model"
              className="input input-bordered"
              value={localConfig.llm.model}
              onChange={(event) => updateSection(['llm', 'model'], event.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="llm-temperature">
              Température
            </label>
            <input
              id="llm-temperature"
              className="input input-bordered"
              type="number"
              step="0.1"
              value={localConfig.llm.temperature}
              onChange={(event) => updateSection(['llm', 'temperature'], Number(event.target.value))}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="llm-max-tokens">
              Tokens maximum
            </label>
            <input
              id="llm-max-tokens"
              className="input input-bordered"
              type="number"
              min="1"
              value={localConfig.llm.maxOutputTokens}
              onChange={(event) => updateSection(['llm', 'maxOutputTokens'], Number(event.target.value))}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="llm-api-key">
              Clé OpenAI
            </label>
            <input
              id="llm-api-key"
              className="input input-bordered"
              type="password"
              value={apiKeyInput}
              placeholder={hasStoredApiKey ? 'Clé enregistrée — saisir pour remplacer' : 'Saisissez votre clé OpenAI'}
              onChange={(event) => {
                setApiKeyInput(event.target.value);
                if (clearApiKey) {
                  setClearApiKey(false);
                }
              }}
              autoComplete="off"
            />
            {hasStoredApiKey ? (
              <p className="form-helper">
                {clearApiKey ? (
                  <>
                    La clé enregistrée sera supprimée lors de la sauvegarde.{' '}
                    <button type="button" className="link cursor-pointer" onClick={toggleClearApiKey}>
                      Annuler
                    </button>
                    .
                  </>
                ) : (
                  <>
                    Une clé est actuellement enregistrée. Laissez le champ vide pour la conserver, saisissez une nouvelle valeur
                    pour la remplacer ou{' '}
                    <button type="button" className="link cursor-pointer" onClick={toggleClearApiKey}>
                      supprimez la clé
                    </button>
                    .
                  </>
                )}
              </p>
            ) : (
              <p className="form-helper">Votre clé sera stockée localement et utilisée uniquement pour la synthèse.</p>
            )}
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend>Options du pipeline</legend>
          <label htmlFor="pipeline-summaries" className="toggle-field">
            <span>Activer la synthèse OpenAI</span>
            <input
              id="pipeline-summaries"
              className="toggle toggle-primary"
              type="checkbox"
              checked={localConfig.pipeline.enableSummaries}
              onChange={(event) => updateSection(['pipeline', 'enableSummaries'], event.target.checked)}
            />
          </label>
          <label htmlFor="pipeline-subtitles" className="toggle-field">
            <span>Générer les sous-titres VTT</span>
            <input
              id="pipeline-subtitles"
              className="toggle toggle-primary"
              type="checkbox"
              checked={localConfig.pipeline.enableSubtitles}
              onChange={(event) => updateSection(['pipeline', 'enableSubtitles'], event.target.checked)}
            />
          </label>
          <label htmlFor="pipeline-diarization" className="toggle-field">
            <span>Activer la diarisation des locuteurs</span>
            <input
              id="pipeline-diarization"
              className="toggle toggle-primary"
              type="checkbox"
              checked={Boolean(localConfig.pipeline.enableDiarization)}
              onChange={(event) => updateSection(['pipeline', 'enableDiarization'], event.target.checked)}
            />
          </label>
        </fieldset>

        {error && <div className="alert alert--error">{error}</div>}
        {success && <div className="alert alert--success">Configuration sauvegardée</div>}

        <button className="btn btn-primary btn-md" type="submit" disabled={saving}>
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </form>
    </section>
  );
}
