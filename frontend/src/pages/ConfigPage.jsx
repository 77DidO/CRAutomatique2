import { useEffect, useMemo, useState } from 'react';
import { fetchConfig, updateConfig } from '../services/api.js';
import './ConfigPage.css';

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
    setDraft((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
    const next = await updateConfig(draft);
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
    <form className="config-page" onSubmit={handleSubmit}>
      <h2>Configuration</h2>
      <section>
        <h3>Général</h3>
        <label>
          Gabarit par défaut
          <input name="defaultTemplate" value={draft.defaultTemplate || ''} onChange={handleChange} />
        </label>
        <label>
          Participants par défaut
          <input
            name="participants"
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
        </label>
      </section>
      <section>
        <h3>Pipeline</h3>
        <label className="checkbox">
          <input type="checkbox" name="diarization" checked={draft.diarization} onChange={handleChange} />
          Activer la diarisation
        </label>
        <label className="checkbox">
          <input type="checkbox" name="enableSummary" checked={draft.enableSummary} onChange={handleChange} />
          Générer la synthèse Markdown
        </label>
      </section>
      <section>
        <h3>LLM</h3>
        <label>
          Fournisseur
          <select name="llmProvider" value={draft.llmProvider} onChange={handleChange}>
            <option value="chatgpt">ChatGPT (OpenAI)</option>
            <option value="ollama">Ollama</option>
          </select>
        </label>
        {draft.llmProvider === 'ollama' ? (
          <div className="provider-grid">
            <label>
              Modèle Ollama
              <input value={ollama.model || ''} onChange={handleProviderChange('ollama', 'model')} />
            </label>
            <label>
              Commande Ollama
              <input value={ollama.command || ''} onChange={handleProviderChange('ollama', 'command')} />
            </label>
          </div>
        ) : (
          <div className="provider-grid">
            <label>
              Modèle ChatGPT
              <input value={chatgpt.model || ''} onChange={handleProviderChange('chatgpt', 'model')} />
            </label>
            <label>
              Clé API ChatGPT
              <input
                type="password"
                value={chatgpt.apiKey || ''}
                onChange={handleProviderChange('chatgpt', 'apiKey')}
                placeholder="sk-..."
              />
            </label>
            <label>
              Base URL (optionnel)
              <input
                value={chatgpt.baseUrl || ''}
                onChange={handleProviderChange('chatgpt', 'baseUrl')}
                placeholder="https://api.openai.com/v1"
              />
            </label>
          </div>
        )}
      </section>
      <footer>
        <button type="submit" disabled={!hasChanged || saving}>
          {saving ? 'Enregistrement...' : 'Sauvegarder'}
        </button>
      </footer>
    </form>
  );
}

export default ConfigPage;
