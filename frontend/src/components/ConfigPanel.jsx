import React, { useState } from 'react';

const computeTypes = ['auto', 'int8', 'float32'];

export default function ConfigPanel({ config, onSave }) {
  const [localConfig, setLocalConfig] = useState(config);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

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
      await onSave(localConfig);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
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
            <label htmlFor="llm-api-key">Clé OpenAI (non stockée ici)</label>
            <input
              id="llm-api-key"
              type="password"
              placeholder="Configurer via variable d'environnement"
              disabled
            />
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
