import React, { useMemo, useState } from 'react';

const emptyTemplate = { name: '', description: '', prompt: '' };

export default function TemplateManager({ templates, onCreate, onUpdate, onDelete }) {
  const [newTemplate, setNewTemplate] = useState(emptyTemplate);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => a.name.localeCompare(b.name)),
    [templates],
  );

  const handleCreate = async (event) => {
    event.preventDefault();
    setError(null);
    if (!newTemplate.name || !newTemplate.prompt) {
      setError('Nom et prompt sont obligatoires');
      return;
    }
    try {
      await onCreate(newTemplate);
      setNewTemplate(emptyTemplate);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdate = async (template) => {
    if (!editing) return;
    try {
      await onUpdate(editing.id, template);
      setEditing(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="surface-card space-y-6">
      <h2 className="section-title">Gabarits de synthèse</h2>
      {error && <div className="alert alert--error">{error}</div>}

      <form className="bg-base-200/60 rounded-xl p-6 space-y-4" onSubmit={handleCreate}>
        <h3 className="section-title">Créer un gabarit</h3>
        <div className="form-field">
          <label className="form-label" htmlFor="template-name">
            Nom
          </label>
          <input
            id="template-name"
            className="input input-bordered"
            value={newTemplate.name}
            onChange={(event) => setNewTemplate((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="template-description">
            Description
          </label>
          <input
            id="template-description"
            className="input input-bordered"
            value={newTemplate.description}
            onChange={(event) => setNewTemplate((prev) => ({ ...prev, description: event.target.value }))}
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="template-prompt">
            Prompt
          </label>
          <textarea
            id="template-prompt"
            className="textarea"
            value={newTemplate.prompt}
            onChange={(event) => setNewTemplate((prev) => ({ ...prev, prompt: event.target.value }))}
            required
          />
        </div>
        <button className="btn btn-primary btn-md" type="submit">
          Créer
        </button>
      </form>

      <div className="template-grid">
        {sortedTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isEditing={editing?.id === template.id}
            onEdit={() => setEditing(template)}
            onCancel={() => setEditing(null)}
            onDelete={() => onDelete(template.id)}
            onSave={handleUpdate}
          />
        ))}
      </div>
    </section>
  );
}

function TemplateCard({ template, isEditing, onEdit, onCancel, onDelete, onSave }) {
  const [draft, setDraft] = useState(template);

  React.useEffect(() => {
    if (isEditing) {
      setDraft(template);
    }
  }, [isEditing, template]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSave(draft);
  };

  const handleDelete = async () => {
    if (window.confirm(`Supprimer le gabarit "${template.name}" ?`)) {
      await onDelete();
    }
  };

  if (isEditing) {
    return (
      <form className="template-card" onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="form-label" htmlFor={`name-${template.id}`}>
            Nom
          </label>
          <input
            id={`name-${template.id}`}
            className="input input-bordered"
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor={`desc-${template.id}`}>
            Description
          </label>
          <input
            id={`desc-${template.id}`}
            className="input input-bordered"
            value={draft.description}
            onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor={`prompt-${template.id}`}>
            Prompt
          </label>
          <textarea
            id={`prompt-${template.id}`}
            className="textarea"
            value={draft.prompt}
            onChange={(event) => setDraft((prev) => ({ ...prev, prompt: event.target.value }))}
            required
          />
        </div>
        <div className="template-actions">
          <button className="btn btn-primary btn-sm" type="submit">
            Sauvegarder
          </button>
          <button className="btn btn-secondary btn-sm" type="button" onClick={onCancel}>
            Annuler
          </button>
        </div>
      </form>
    );
  }

  return (
    <article className="template-card">
      <header>
        <h3 className="section-title mb-2">{template.name}</h3>
        <p className="text-base-content/70 text-sm">{template.description || 'Pas de description'}</p>
      </header>
      <pre className="prompt-preview">{template.prompt}</pre>
      <div className="template-actions">
        <button className="btn btn-secondary btn-sm" type="button" onClick={onEdit}>
          Modifier
        </button>
        <button className="btn btn-error btn-sm" type="button" onClick={handleDelete}>
          Supprimer
        </button>
      </div>
    </article>
  );
}
