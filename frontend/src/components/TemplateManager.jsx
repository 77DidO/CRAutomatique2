import { useEffect, useMemo, useState } from 'react';

const EMPTY_TEMPLATE = {
  name: '',
  description: '',
  prompt: ''
};

function buildFormState(template) {
  if (!template) {
    return { ...EMPTY_TEMPLATE };
  }
  return {
    name: template.name ?? '',
    description: template.description ?? '',
    prompt: template.prompt ?? ''
  };
}

export default function TemplateManager({ templates = [], onCreate, onUpdate, onDelete }) {
  const [selectedId, setSelectedId] = useState(null);
  const [editForm, setEditForm] = useState(buildFormState(null));
  const [newForm, setNewForm] = useState(buildFormState(null));
  const [editError, setEditError] = useState(null);
  const [createError, setCreateError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!templates.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !templates.some((template) => template.id === selectedId)) {
      setSelectedId(templates[0].id);
    }
  }, [templates, selectedId]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? null,
    [templates, selectedId]
  );

  useEffect(() => {
    setEditForm(buildFormState(selectedTemplate));
    setEditError(null);
  }, [selectedTemplate]);

  const handleEditChange = (field, value) => {
    setEditForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleNewChange = (field, value) => {
    setNewForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!selectedTemplate) {
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      await onUpdate?.(selectedTemplate.id, editForm);
    } catch (error) {
      setEditError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) {
      return;
    }
    if (selectedTemplate.id === 'default') {
      setEditError('Le gabarit par défaut ne peut pas être supprimé.');
      return;
    }
    if (typeof window !== 'undefined' && !window.confirm('Supprimer ce gabarit ?')) {
      return;
    }
    setDeleting(true);
    setEditError(null);
    try {
      await onDelete?.(selectedTemplate.id);
      setSelectedId((currentId) => (currentId === selectedTemplate.id ? null : currentId));
    } catch (error) {
      setEditError(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const created = await onCreate?.(newForm);
      if (created?.id) {
        setNewForm(buildFormState(null));
        setSelectedId(created.id);
      }
    } catch (error) {
      setCreateError(error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <aside className="bg-base-200/60 rounded-xl p-4 space-y-6">
          <h3 className="section-title m-0">Gabarits existants</h3>
          {templates.length === 0 && (
            <p className="text-base-content/70 text-sm m-0">Aucun gabarit enregistré pour le moment.</p>
          )}
          {templates.length > 0 && (
            <div className="diarization-segment-list">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className="w-full text-left"
                  onClick={() => setSelectedId(template.id)}
                  style={{ border: 'none', background: 'transparent', padding: 0 }}
                >
                  <div
                    className={`diarization-segment ${template.id === selectedId ? 'history-row--active' : ''}`}
                  >
                    <p className="m-0 font-medium text-base-content">{template.name}</p>
                    <p className="m-0 text-xs text-base-content/70">
                      {template.description || 'Sans description'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>
        <div className="bg-base-100 rounded-xl p-4 space-y-6 shadow-lg">
          {selectedTemplate ? (
            <form className="space-y-6" onSubmit={handleEditSubmit}>
              <div className="form-field">
                <label className="form-label" htmlFor="template-name">
                  Nom
                </label>
                <input
                  id="template-name"
                  className="input input-bordered"
                  type="text"
                  value={editForm.name}
                  onChange={(event) => handleEditChange('name', event.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="template-description">
                  Description
                </label>
                <textarea
                  id="template-description"
                  className="textarea"
                  value={editForm.description}
                  onChange={(event) => handleEditChange('description', event.target.value)}
                  rows={3}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="template-prompt">
                  Prompt
                </label>
                <textarea
                  id="template-prompt"
                  className="textarea"
                  value={editForm.prompt}
                  onChange={(event) => handleEditChange('prompt', event.target.value)}
                  rows={8}
                  required
                />
                <p className="form-helper">
                  Rédigez les consignes destinées au modèle pour produire le compte rendu souhaité.
                </p>
              </div>
              {editError && <p className="error-text text-sm m-0">{editError}</p>}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  className="btn btn-error btn-sm"
                  onClick={handleDelete}
                  disabled={saving || deleting}
                >
                  {deleting ? 'Suppression…' : 'Supprimer'}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-base-content/70 text-sm m-0">Sélectionnez un gabarit pour le modifier.</p>
          )}
        </div>
      </div>

      <div className="bg-base-200/60 rounded-xl p-4 space-y-6">
        <h3 className="section-title m-0">Ajouter un gabarit</h3>
        <form className="space-y-6" onSubmit={handleCreate}>
          <div className="form-field">
            <label className="form-label" htmlFor="new-template-name">
              Nom
            </label>
            <input
              id="new-template-name"
              className="input input-bordered"
              type="text"
              value={newForm.name}
              onChange={(event) => handleNewChange('name', event.target.value)}
              placeholder="Compte rendu marketing, entretien RH..."
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="new-template-description">
              Description
            </label>
            <textarea
              id="new-template-description"
              className="textarea"
              value={newForm.description}
              onChange={(event) => handleNewChange('description', event.target.value)}
              rows={3}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="new-template-prompt">
              Prompt
            </label>
            <textarea
              id="new-template-prompt"
              className="textarea"
              value={newForm.prompt}
              onChange={(event) => handleNewChange('prompt', event.target.value)}
              rows={6}
              placeholder="Expliquez au modèle comment structurer le compte rendu."
              required
            />
          </div>
          {createError && <p className="error-text text-sm m-0">{createError}</p>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={creating}>
            {creating ? 'Ajout…' : 'Ajouter le gabarit'}
          </button>
        </form>
      </div>
    </div>
  );
}
