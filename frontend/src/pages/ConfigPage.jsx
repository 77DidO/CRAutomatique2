import { useEffect, useMemo, useState } from 'react';
import { fetchConfig, updateConfig } from '../services/api.js';

function ConfigPage() {
  const [config, setConfig] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig().then((data) => {
      setConfig(data);
      setDraft(data);
    });
  }, []);

  const hasChanged = useMemo(() => JSON.stringify(config) !== JSON.stringify(draft), [config, draft]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    let nextValue;
    if (type === 'checkbox') {
      nextValue = checked;
    } else if (type === 'number') {
      nextValue = value === '' ? '' : Number(value);
    } else {
      nextValue = value;
    }
    setDraft((prev) => ({
      ...prev,
      [name]: nextValue
    }));
  };

  const handleProviderChange = (providerKey, field) => (event) => {
    const { value } = event.target;
    setDraft((prev) => ({
      ...prev,
      providers: {
        ...(prev.providers || {}),
        [providerKey]: {
          ...(prev.providers?.[providerKey] || {}),
          [field]: value
        }
      }
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      ...draft,
      providers: Object.fromEntries(
        Object.entries(draft.providers || {}).map(([key, value]) => [key, { ...value }])
      )
    };

    const sanitizeNumber = (input, predicate) => {
      if (input === '' || input === null || input === undefined) {
        return undefined;
      }
      const parsed = Number(input);
      return predicate(parsed) ? parsed : undefined;
    };

    const chunkSize = sanitizeNumber(payload.chunkSize, (number) => Number.isFinite(number) && number > 0);
    const chunkOverlap = sanitizeNumber(payload.chunkOverlap, (number) => Number.isFinite(number) && number >= 0);

    if (chunkSize === undefined) {
      delete payload.chunkSize;
    } else {
      payload.chunkSize = chunkSize;
    }

    if (chunkOverlap === undefined) {
      delete payload.chunkOverlap;
    } else {
      payload.chunkOverlap = chunkOverlap;
    }

    const next = await updateConfig(payload);
    setConfig(next);
    setDraft(next);
    setSaving(false);
  };

  if (!draft) {
    return <p>Chargement...</p>;
  }

  const providers = draft.providers || {};
  const chatgpt = providers.chatgpt || {};
  const ollama = providers.ollama || {};

  return (
    <section className="surface-card">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <h1 className="section-title">Configuration</h1>
          <p className="text-base-content/70 m-0">
            Ajustez les paramètres par défaut du pipeline et des fournisseurs LLM.
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="section-title m-0">Général</h2>
          <div className="form-field">
            <label htmlFor="defaultTemplate" className="form-label">
              Gabarit par défaut
            </label>
            <input
              id="defaultTemplate"
              name="defaultTemplate"
              type="text"
              className="input input-bordered"
              value={draft.defaultTemplate || ''}
              onChange={handleChange}
            />
          </div>
          <div className="form-field">
            <label htmlFor="participants" className="form-label">
              Participants par défaut
            </label>
            <input
              id="participants"
              type="text"
              className="input input-bordered"
              value={(draft.participants || []).join(', ')}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  participants: event.target.value
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean)
                }))
              }
            />
            <p className="form-helper">Séparer les participants par une virgule</p>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="section-title m-0">Pipeline</h2>
          <label htmlFor="diarization" className="form-field">
            <span className="form-label">Activer la diarisation</span>
            <input
              id="diarization"
              type="checkbox"
              name="diarization"
              className="toggle toggle-primary"
              checked={draft.diarization}
              onChange={handleChange}
            />
          </label>
          <label htmlFor="enableSummary" className="form-field">
            <span className="form-label">Générer la synthèse Markdown</span>
            <input
              id="enableSummary"
              type="checkbox"
              name="enableSummary"
              className="toggle toggle-primary"
              checked={draft.enableSummary}
              onChange={handleChange}
            />
          </label>
        </div>

        <div className="space-y-6">
          <h2 className="section-title m-0">Fournisseur LLM</h2>
          <div className="form-field">
            <label htmlFor="llmProvider" className="form-label">
              Fournisseur
            </label>
            <select
              id="llmProvider"
              name="llmProvider"
              className="select select-bordered"
              value={draft.llmProvider}
              onChange={handleChange}
            >
              <option value="chatgpt">ChatGPT (OpenAI)</option>
              <option value="ollama">Ollama</option>
            </select>
          </div>

          {draft.llmProvider === 'ollama' ? (
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="ollamaModel" className="form-label">
                  Modèle Ollama
                </label>
                <input
                  id="ollamaModel"
                  type="text"
                  className="input input-bordered"
                  value={ollama.model || ''}
                  onChange={handleProviderChange('ollama', 'model')}
                />
              </div>
              <div className="form-field">
                <label htmlFor="ollamaCommand" className="form-label">
                  Commande Ollama
                </label>
                <input
                  id="ollamaCommand"
                  type="text"
                  className="input input-bordered"
                  value={ollama.command || ''}
                  onChange={handleProviderChange('ollama', 'command')}
                />
              </div>
            </div>
          ) : (
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="chatgptModel" className="form-label">
                  Modèle ChatGPT
                </label>
                <input
                  id="chatgptModel"
                  type="text"
                  className="input input-bordered"
                  value={chatgpt.model || ''}
                  onChange={handleProviderChange('chatgpt', 'model')}
                />
              </div>
              <div className="form-field">
                <label htmlFor="chatgptApiKey" className="form-label">
                  Clé API ChatGPT
                </label>
                <input
                  id="chatgptApiKey"
                  type="password"
                  className="input input-bordered"
                  value={chatgpt.apiKey || ''}
                  onChange={handleProviderChange('chatgpt', 'apiKey')}
                  placeholder="sk-..."
                />
              </div>
              <div className="form-field">
                <label htmlFor="chatgptBaseUrl" className="form-label">
                  Base URL (optionnel)
                </label>
                <input
                  id="chatgptBaseUrl"
                  type="text"
                  className="input input-bordered"
                  value={chatgpt.baseUrl || ''}
                  onChange={handleProviderChange('chatgpt', 'baseUrl')}
                  placeholder="https://api.openai.com/v1"
                />
              </div>
            </div>
          )}
        </div>

        <div className="form-actions form-actions--end">
          <button type="submit" className="btn btn-primary" disabled={!hasChanged || saving}>
            {saving ? 'Enregistrement…' : 'Sauvegarder'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ConfigPage;
