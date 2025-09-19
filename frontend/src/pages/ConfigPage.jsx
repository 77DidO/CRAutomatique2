import { useEffect, useMemo, useState } from 'react';
import { fetchConfig, updateConfig } from '../services/api.js';

const DEFAULT_DIARIZATION = {
  enable: false,
  speaker_count: null,
  min_speakers: null,
  max_speakers: null
};

const parseBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }
  return Boolean(value);
};

const toNullableNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const ensureDiarizationDraft = (rawValue) => {
  if (typeof rawValue === 'boolean') {
    return {
      ...DEFAULT_DIARIZATION,
      enable: rawValue
    };
  }

  if (!rawValue || typeof rawValue !== 'object') {
    return { ...DEFAULT_DIARIZATION };
  }

  return {
    enable: parseBoolean(rawValue.enable ?? rawValue),
    speaker_count: toNullableNumber(rawValue.speaker_count),
    min_speakers: toNullableNumber(rawValue.min_speakers),
    max_speakers: toNullableNumber(rawValue.max_speakers)
  };
};

const prepareDraft = (config) => {
  if (!config || typeof config !== 'object') {
    return {
      diarization: { ...DEFAULT_DIARIZATION }
    };
  }

  const { defaultTemplate, participants, diarization, ...rest } = config;
  return {
    ...rest,
    diarization: ensureDiarizationDraft(diarization)
  };
};

function ConfigPage() {
  const [config, setConfig] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig().then((data) => {
      const prepared = prepareDraft(data);
      setConfig(prepared);
      setDraft(prepared);
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

  const handleDiarizationChange = (field) => (event) => {
    const { type, checked, value } = event.target;
    setDraft((prev) => {
      const previous = prev?.diarization ? prev.diarization : { ...DEFAULT_DIARIZATION };
      if (type === 'checkbox') {
        return {
          ...prev,
          diarization: {
            ...previous,
            [field]: checked
          }
        };
      }

      const parsed = value === '' ? null : Number(value);
      const nextValue = parsed === null || Number.isFinite(parsed) ? parsed : previous[field];

      return {
        ...prev,
        diarization: {
          ...previous,
          [field]: nextValue
        }
      };
    });
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

    const diarizationPayload = {
      enable: Boolean(draft.diarization?.enable)
    };

    const speakerCount = toNullableNumber(draft.diarization?.speaker_count);
    if (speakerCount !== null) {
      diarizationPayload.speaker_count = speakerCount;
    }

    const minSpeakers = toNullableNumber(draft.diarization?.min_speakers);
    if (minSpeakers !== null) {
      diarizationPayload.min_speakers = minSpeakers;
    }

    const maxSpeakers = toNullableNumber(draft.diarization?.max_speakers);
    if (maxSpeakers !== null) {
      diarizationPayload.max_speakers = maxSpeakers;
    }

    payload.diarization = diarizationPayload;

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

    const next = prepareDraft(await updateConfig(payload));
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
          <h2 className="section-title m-0">Pipeline</h2>
          <p className="text-base-content/70 m-0">
            Activez la diarisation pour détecter plusieurs locuteurs. Indiquez un nombre exact ou
            une plage (minimum/maximum) si nécessaire et laissez les champs vides pour conserver la
            détection automatique. Les anciens paramètres de gabarit et de participants par défaut
            ont été retirés au profit de ce formulaire.
          </p>
          <label htmlFor="diarization" className="form-field">
            <span className="form-label">Activer la diarisation</span>
            <input
              id="diarization"
              type="checkbox"
              name="diarization"
              className="toggle toggle-primary"
              checked={draft.diarization?.enable || false}
              onChange={handleDiarizationChange('enable')}
            />
          </label>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="speakerCount" className="form-label">
                Nombre exact de locuteurs
              </label>
              <input
                id="speakerCount"
                type="number"
                min="1"
                className="input input-bordered"
                placeholder="Détection automatique si vide"
                value={draft.diarization?.speaker_count ?? ''}
                onChange={handleDiarizationChange('speaker_count')}
                disabled={!draft.diarization?.enable}
              />
              <p className="form-helper">Laisser vide pour laisser le modèle choisir.</p>
            </div>
            <div className="form-field">
              <label htmlFor="minSpeakers" className="form-label">
                Minimum de locuteurs
              </label>
              <input
                id="minSpeakers"
                type="number"
                min="1"
                className="input input-bordered"
                placeholder="Optionnel"
                value={draft.diarization?.min_speakers ?? ''}
                onChange={handleDiarizationChange('min_speakers')}
                disabled={!draft.diarization?.enable}
              />
            </div>
            <div className="form-field">
              <label htmlFor="maxSpeakers" className="form-label">
                Maximum de locuteurs
              </label>
              <input
                id="maxSpeakers"
                type="number"
                min="1"
                className="input input-bordered"
                placeholder="Optionnel"
                value={draft.diarization?.max_speakers ?? ''}
                onChange={handleDiarizationChange('max_speakers')}
                disabled={!draft.diarization?.enable}
              />
            </div>
          </div>
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
