import { useEffect, useMemo, useState } from 'react';
import { fetchConfig, fetchTemplates, updateConfig, updateTemplates } from '../services/api.js';
import DEFAULT_TEMPLATES from '../constants/templates.js';

const DEFAULT_DIARIZATION = {
  enable: false,
  speaker_count: null,
  min_speakers: null,
  max_speakers: null
};

const DEFAULT_RUBRICS = ['Thème', 'Participants', 'Décisions', 'Actions à venir'];

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

const ensureRubricDraft = (rubrics) => {
  if (!Array.isArray(rubrics) || rubrics.length === 0) {
    return [...DEFAULT_RUBRICS];
  }

  const sanitized = rubrics
    .map((rubric) => (typeof rubric === 'string' ? rubric.trim() : ''))
    .filter((rubric) => rubric.length > 0);

  if (sanitized.length === 0) {
    return [...DEFAULT_RUBRICS];
  }

  return sanitized;
};

const prepareDraft = (config) => {
  if (!config || typeof config !== 'object') {
    return {
      diarization: { ...DEFAULT_DIARIZATION },
      rubrics: [...DEFAULT_RUBRICS]
    };
  }

  const { defaultTemplate, participants, diarization, templates: _templates, rubrics, ...rest } = config;
  return {
    ...rest,
    diarization: ensureDiarizationDraft(diarization),
    rubrics: ensureRubricDraft(rubrics)
  };
};

const ensureTemplateDraftList = (templates) => {
  const source = Array.isArray(templates) ? templates : DEFAULT_TEMPLATES;
  const usedIds = new Set();
  const sanitized = [];

  source.forEach((template, index) => {
    if (!template || typeof template !== 'object') {
      return;
    }

    const rawId = typeof template.id === 'string' && template.id.trim() ? template.id.trim() : `template-${index + 1}`;
    let candidateId = rawId;
    let suffix = 1;
    while (usedIds.has(candidateId)) {
      candidateId = `${rawId}-${suffix++}`;
    }
    usedIds.add(candidateId);

    sanitized.push({
      id: candidateId,
      label: typeof template.label === 'string' ? template.label : '',
      prompt: typeof template.prompt === 'string' ? template.prompt : ''
    });
  });

  if (sanitized.length === 0) {
    return DEFAULT_TEMPLATES.map((template) => ({ ...template }));
  }

  return sanitized;
};

const createEmptyTemplate = (existing) => {
  const ids = new Set(existing.map((template) => template.id));
  const base = `template-${Date.now()}`;
  let candidate = base;
  let offset = 1;
  while (ids.has(candidate)) {
    candidate = `${base}-${offset++}`;
  }
  return {
    id: candidate,
    label: '',
    prompt: ''
  };
};

function ConfigPage() {
  const [config, setConfig] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [configError, setConfigError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templateDraft, setTemplateDraft] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesSaving, setTemplatesSaving] = useState(false);
  const [templatesError, setTemplatesError] = useState(null);

  useEffect(() => {
    let ignore = false;

    const loadConfig = async () => {
      try {
        const data = await fetchConfig();
        if (ignore) {
          return;
        }
        const prepared = prepareDraft(data);
        setConfig(prepared);
        setDraft(prepared);
        setConfigError(null);
      } catch (error) {
        console.error('Impossible de charger la configuration.', error);
        if (ignore) {
          return;
        }
        const fallback = prepareDraft(null);
        setConfig(fallback);
        setDraft(fallback);
        setConfigError(
          "Impossible de récupérer la configuration actuelle. Les valeurs par défaut sont affichées."
        );
      }
    };

    loadConfig();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadTemplates = async () => {
      try {
        const data = await fetchTemplates();
        if (!ignore) {
          const normalized = ensureTemplateDraftList(data);
          setTemplates(normalized);
          setTemplateDraft(normalized);
          setTemplatesError(null);
        }
      } catch (error) {
        console.error('Impossible de charger les gabarits.', error);
        if (!ignore) {
          const fallback = ensureTemplateDraftList(DEFAULT_TEMPLATES);
          setTemplates(fallback);
          setTemplateDraft(fallback);
          setTemplatesError(
            'Impossible de charger les gabarits depuis le serveur. Les valeurs par défaut sont affichées.'
          );
        }
      } finally {
        if (!ignore) {
          setTemplatesLoading(false);
        }
      }
    };

    loadTemplates();

    return () => {
      ignore = true;
    };
  }, []);

  const hasChanged = useMemo(() => JSON.stringify(config) !== JSON.stringify(draft), [config, draft]);
  const templatesHaveChanged = useMemo(
    () => JSON.stringify(templates) !== JSON.stringify(templateDraft),
    [templates, templateDraft]
  );

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

  const handleRubricChange = (index) => (event) => {
    const { value } = event.target;
    setDraft((prev) => {
      const previous = Array.isArray(prev?.rubrics) ? prev.rubrics : [];
      const nextRubrics = previous.map((rubric, rubricIndex) =>
        rubricIndex === index ? value : rubric
      );
      return {
        ...prev,
        rubrics: nextRubrics
      };
    });
  };

  const handleRemoveRubric = (index) => () => {
    setDraft((prev) => {
      const previous = Array.isArray(prev?.rubrics) ? prev.rubrics : [];
      const nextRubrics = previous.filter((_, rubricIndex) => rubricIndex !== index);
      return {
        ...prev,
        rubrics: nextRubrics
      };
    });
  };

  const handleAddRubric = () => {
    setDraft((prev) => {
      const previous = Array.isArray(prev?.rubrics) ? prev.rubrics : [];
      return {
        ...prev,
        rubrics: [...previous, '']
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
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
      const chunkOverlap = sanitizeNumber(
        payload.chunkOverlap,
        (number) => Number.isFinite(number) && number >= 0
      );

      const normalizedRubrics = Array.isArray(draft.rubrics) ? draft.rubrics : [];
      payload.rubrics = normalizedRubrics
        .map((rubric) => (typeof rubric === 'string' ? rubric.trim() : ''))
        .filter((rubric) => rubric.length > 0);

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
      setConfigError(null);
    } catch (error) {
      console.error('Impossible de sauvegarder la configuration.', error);
      setSaveError('Impossible de sauvegarder la configuration. Vérifiez la connexion au serveur et réessayez.');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateFieldChange = (index, field) => (event) => {
    const { value } = event.target;
    setTemplateDraft((prev) =>
      prev.map((template, templateIndex) =>
        templateIndex === index ? { ...template, [field]: value } : template
      )
    );
  };

  const handleRemoveTemplate = (id) => () => {
    setTemplateDraft((prev) => prev.filter((template) => template.id !== id));
  };

  const handleAddTemplate = () => {
    setTemplateDraft((prev) => {
      const next = Array.isArray(prev) ? prev : [];
      return [...next, createEmptyTemplate(next)];
    });
  };

  const handleTemplatesSubmit = async () => {
    setTemplatesSaving(true);
    setTemplatesError(null);
    try {
      const payload = templateDraft.map((template) => ({
        id: template.id,
        label: template.label,
        prompt: template.prompt
      }));
      const updated = await updateTemplates(payload);
      const normalized = ensureTemplateDraftList(updated);
      setTemplates(normalized);
      setTemplateDraft(normalized);
      setTemplatesError(null);
    } catch (error) {
      console.error('Impossible de sauvegarder les gabarits.', error);
      setTemplatesError('Impossible de sauvegarder les gabarits. Vérifiez la connexion au serveur et réessayez.');
    } finally {
      setTemplatesSaving(false);
    }
  };

  if (!draft) {
    return <p>Chargement...</p>;
  }

  const providers = draft.providers || {};
  const chatgpt = providers.chatgpt || {};
  const ollama = providers.ollama || {};
  const rubrics = Array.isArray(draft.rubrics) ? draft.rubrics : [];

  return (
    <section className="surface-card">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <h1 className="section-title">Configuration</h1>
          <p className="text-base-content/70 m-0">
            Ajustez les paramètres par défaut du pipeline et des fournisseurs LLM.
          </p>
          {configError && (
            <p role="alert" className="status-message error-text">
              {configError}
            </p>
          )}
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

          <div className="space-y-3 rounded-xl border border-base-300 bg-base-200/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="m-0 text-lg font-semibold">Rubriques du résumé</h3>
                <p className="text-base-content/70 m-0">
                  Définissez l'ordre et l'intitulé des sections utilisées lors de la génération des comptes rendus.
                </p>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleAddRubric}>
                Ajouter une rubrique
              </button>
            </div>

            {rubrics.length === 0 ? (
              <p className="m-0 italic text-base-content/70">
                Aucune rubrique définie. Ajoutez-en pour guider la structure des synthèses.
              </p>
            ) : (
              <div className="space-y-3">
                {rubrics.map((rubric, index) => {
                  const inputId = `rubric-${index}`;
                  return (
                    <div key={inputId} className="space-y-2 rounded-lg border border-base-300 bg-base-100 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="form-label m-0" htmlFor={inputId}>
                          Rubrique {index + 1}
                        </label>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={handleRemoveRubric(index)}
                        >
                          Supprimer
                        </button>
                      </div>
                      <input
                        id={inputId}
                        type="text"
                        className="input input-bordered w-full"
                        value={rubric}
                        onChange={handleRubricChange(index)}
                        placeholder={`Titre de rubrique ${index + 1}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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

        <div className="space-y-6">
          <h2 className="section-title m-0">Gabarits de synthèse</h2>
          <p className="text-base-content/70 m-0">
            Personnalisez les gabarits disponibles lors du lancement d&apos;un traitement. Le champ
            <code className="mx-1">{'{text}'}</code> sera remplacé par la transcription nettoyée et
            <code className="mx-1">{'{language_instruction}'}</code> par les consignes de langue si présentes.
          </p>

          {templatesError && (
            <p role="alert" className="status-message error-text">
              {templatesError}
            </p>
          )}

          {templatesLoading ? (
            <p>Chargement des gabarits…</p>
          ) : (
            <div className="space-y-4">
              {templateDraft.map((template, index) => {
                const labelId = `template-label-${index}`;
                const promptId = `template-prompt-${index}`;
                return (
                  <div
                    key={template.id}
                    className="space-y-4 rounded-xl border border-base-300 bg-base-200/60 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="m-0 text-lg font-semibold">
                        {template.label || `Gabarit ${index + 1}`}
                      </h3>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleRemoveTemplate(template.id)}
                        disabled={templateDraft.length <= 1}
                      >
                        Supprimer
                      </button>
                    </div>
                    <div className="form-field">
                      <label className="form-label" htmlFor={labelId}>
                        Libellé
                      </label>
                      <input
                        id={labelId}
                        type="text"
                        className="input input-bordered"
                        value={template.label}
                        onChange={handleTemplateFieldChange(index, 'label')}
                        placeholder="Résumé synthétique"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label" htmlFor={promptId}>
                        Prompt
                      </label>
                      <textarea
                        id={promptId}
                        className="textarea textarea-bordered"
                        rows={6}
                        value={template.prompt}
                        onChange={handleTemplateFieldChange(index, 'prompt')}
                        placeholder="Décrivez le format attendu et utilisez {text} comme variable."
                      />
                      <p className="form-helper">
                        Ajoutez des consignes précises et utilisez les variables disponibles pour personnaliser la sortie.
                      </p>
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn btn-outline" onClick={handleAddTemplate}>
                  Ajouter un gabarit
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleTemplatesSubmit}
                  disabled={!templatesHaveChanged || templatesSaving}
                >
                  {templatesSaving ? 'Enregistrement…' : 'Sauvegarder les gabarits'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="form-actions form-actions--end">
          <button type="submit" className="btn btn-primary" disabled={!hasChanged || saving}>
            {saving ? 'Enregistrement…' : 'Sauvegarder'}
          </button>
        </div>
        {saveError && (
          <p role="alert" className="status-message error-text">
            {saveError}
          </p>
        )}
      </form>
    </section>
  );
}

export default ConfigPage;
