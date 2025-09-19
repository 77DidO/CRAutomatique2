import { useEffect, useState } from 'react';

function ConfigForm({ config, templates = [], onSubmit, isSaving }) {
  const [defaultTemplate, setDefaultTemplate] = useState('');
  const [chunkSize, setChunkSize] = useState(1500);
  const [chunkOverlap, setChunkOverlap] = useState(150);
  const [diarizationEnabled, setDiarizationEnabled] = useState(true);
  const [provider, setProvider] = useState('chatgpt');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [ollamaHost, setOllamaHost] = useState('');

  useEffect(() => {
    if (!config) {
      return;
    }
    setDefaultTemplate(config.defaultTemplate || templates[0]?.id || '');
    setChunkSize(config.chunkSize || 1500);
    setChunkOverlap(config.chunkOverlap || 150);
    const diarization = typeof config.diarization === 'object' ? config.diarization.enable : Boolean(config.diarization);
    setDiarizationEnabled(diarization !== false);
    setProvider(config.llmProvider || 'chatgpt');
    setOpenaiApiKey(config.providers?.chatgpt?.apiKey || '');
    setOllamaHost(config.providers?.ollama?.host || '');
  }, [config, templates]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!onSubmit) {
      return;
    }

    const nextConfig = {
      ...config,
      defaultTemplate,
      chunkSize: Number(chunkSize) || 1500,
      chunkOverlap: Number(chunkOverlap) || 150,
      diarization: { ...config?.diarization, enable: diarizationEnabled },
      llmProvider: provider,
      providers: {
        ...config?.providers,
        chatgpt: {
          ...config?.providers?.chatgpt,
          apiKey: openaiApiKey
        },
        ollama: {
          ...config?.providers?.ollama,
          host: ollamaHost
        }
      }
    };

    onSubmit(nextConfig);
  };

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Configuration générale</h2>
      </header>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span>Modèle par défaut</span>
          <select value={defaultTemplate} onChange={(event) => setDefaultTemplate(event.target.value)}>
            {templates.map((templateItem) => (
              <option key={templateItem.id} value={templateItem.id}>
                {templateItem.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form__field">
          <span>Taille de segment</span>
          <input type="number" value={chunkSize} onChange={(event) => setChunkSize(event.target.value)} />
        </label>

        <label className="form__field">
          <span>Recouvrement</span>
          <input type="number" value={chunkOverlap} onChange={(event) => setChunkOverlap(event.target.value)} />
        </label>

        <label className="form__field form__field--checkbox">
          <input
            type="checkbox"
            checked={diarizationEnabled}
            onChange={(event) => setDiarizationEnabled(event.target.checked)}
          />
          <span>Activer la diarisation</span>
        </label>

        <label className="form__field">
          <span>Fournisseur IA</span>
          <select value={provider} onChange={(event) => setProvider(event.target.value)}>
            <option value="chatgpt">ChatGPT (OpenAI)</option>
            <option value="ollama">Ollama</option>
          </select>
        </label>

        {provider === 'chatgpt' && (
          <label className="form__field">
            <span>Clé API OpenAI</span>
            <input value={openaiApiKey} onChange={(event) => setOpenaiApiKey(event.target.value)} />
          </label>
        )}

        {provider === 'ollama' && (
          <label className="form__field">
            <span>Hôte Ollama</span>
            <input value={ollamaHost} onChange={(event) => setOllamaHost(event.target.value)} />
          </label>
        )}

        <button className="btn btn-primary" type="submit" disabled={isSaving}>
          {isSaving ? 'Enregistrement…' : 'Mettre à jour'}
        </button>
      </form>
    </section>
  );
}

export default ConfigForm;
