import React, { useEffect, useState } from 'react';

const computeTypes = ['auto', 'int8', 'float32'];

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
    <section className="card">
      <h2 className="section-title">Configuration du pipeline</h2>
      <form className="config-form" onSubmit={handleSubmit}>
        <fieldset>
          <legend>Whisper local</legend>
          <div className="input-group">
            <label htmlFor="whisper-model">Modèle</label>
            <input
              id="whisper-model"
              value={localConfig.whisper.model}
              onChange={(event) => updateSection(['whisper', 'model'], event.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="whisper-language">Langue (optionnel)</label>
            <input
              id="whisper-language"
              value={localConfig.whisper.language ?? ''}
              onChange={(event) => updateSection(['whisper', 'language'], event.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="whisper-compute">Type de calcul</label>
            <select
              id="whisper-compute"
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
          <div className="input-group">
            <label htmlFor="whisper-batch">Taille de batch</label>
            <input
              id="whisper-batch"
              type="number"
              min="0"
              value={localConfig.whisper.batchSize ?? 0}
              onChange={(event) => updateSection(['whisper', 'batchSize'], Number(event.target.value))}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend>OpenAI</legend>
          <div className="input-group">
            <label htmlFor="llm-model">Modèle</label>
            <input
              id="llm-model"
              value={localConfig.llm.model}
              onChange={(event) => updateSection(['llm', 'model'], event.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="llm-temperature">Température</label>
            <input
              id="llm-temperature"
              type="number"
              step="0.1"
              value={localConfig.llm.temperature}
              onChange={(event) => updateSection(['llm', 'temperature'], Number(event.target.value))}
            />
          </div>
          <div className="input-group">
            <label htmlFor="llm-max-tokens">Tokens maximum</label>
            <input
              id="llm-max-tokens"
              type="number"
              min="1"
              value={localConfig.llm.maxOutputTokens}
              onChange={(event) => updateSection(['llm', 'maxOutputTokens'], Number(event.target.value))}
            />
          </div>
          <div className="input-group">
            <label htmlFor="llm-api-key">Clé OpenAI</label>
            <input
              id="llm-api-key"
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
              <p className="input-hint">
                {clearApiKey ? (
                  <>
                    La clé enregistrée sera supprimée lors de la sauvegarde.{' '}
                    <button type="button" className="link-button" onClick={toggleClearApiKey}>
                      Annuler
                    </button>
                    .
                  </>
                ) : (
                  <>
                    Une clé est actuellement enregistrée. Laissez le champ vide pour la conserver, saisissez une nouvelle valeur
                    pour la remplacer ou{' '}
                    <button type="button" className="link-button" onClick={toggleClearApiKey}>
                      supprimez la clé
                    </button>
                    .
                  </>
                )}
              </p>
            ) : (
              <p className="input-hint">Votre clé sera stockée localement et utilisée uniquement pour la synthèse.</p>
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend>Options du pipeline</legend>
          <label className="toggle">
            <input
              type="checkbox"
              checked={localConfig.pipeline.enableSummaries}
              onChange={(event) => updateSection(['pipeline', 'enableSummaries'], event.target.checked)}
            />
            <span>Activer la synthèse OpenAI</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={localConfig.pipeline.enableSubtitles}
              onChange={(event) => updateSection(['pipeline', 'enableSubtitles'], event.target.checked)}
            />
            <span>Générer les sous-titres VTT</span>
          </label>
        </fieldset>

        {error && <p className="toast error">{error}</p>}
        {success && <p className="toast success">Configuration sauvegardée</p>}

        <button className="button primary" type="submit" disabled={saving}>
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </form>
    </section>
  );
}
