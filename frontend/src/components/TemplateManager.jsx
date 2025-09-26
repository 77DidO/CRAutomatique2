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
    <section className="template-manager card">
      <h2 className="section-title">Gabarits de synthèse</h2>
      {error && <p className="toast error">{error}</p>}

      <form className="inner-card" onSubmit={handleCreate}>
        <h3>Créer un gabarit</h3>
        <div className="input-group">
          <label htmlFor="template-name">Nom</label>
          <input
            id="template-name"
            value={newTemplate.name}
            onChange={(event) => setNewTemplate((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </div>
        <div className="input-group">
          <label htmlFor="template-description">Description</label>
          <input
            id="template-description"
            value={newTemplate.description}
            onChange={(event) => setNewTemplate((prev) => ({ ...prev, description: event.target.value }))}
          />
        </div>
        <div className="input-group">
          <label htmlFor="template-prompt">Prompt</label>
          <textarea
            id="template-prompt"
            className="large"
            value={newTemplate.prompt}
            onChange={(event) => setNewTemplate((prev) => ({ ...prev, prompt: event.target.value }))}
            required
          />
        </div>
        <button className="button primary" type="submit">
          Créer
        </button>
      </form>

      <div className="template-grid">
        <div className="template-grid-header" aria-hidden="true">
          <span>Nom</span>
          <span>Description</span>
          <span>Actions</span>
        </div>
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
      <form className="template-card template-card--edit" onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor={`name-${template.id}`}>Nom</label>
          <input
            id={`name-${template.id}`}
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </div>
        <div className="input-group">
          <label htmlFor={`desc-${template.id}`}>Description</label>
          <input
            id={`desc-${template.id}`}
            value={draft.description}
            onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
          />
        </div>
        <div className="input-group">
          <label htmlFor={`prompt-${template.id}`}>Prompt</label>
          <textarea
            id={`prompt-${template.id}`}
            className="large"
            value={draft.prompt}
            onChange={(event) => setDraft((prev) => ({ ...prev, prompt: event.target.value }))}
            required
          />
        </div>
        <div className="template-actions">
          <button className="button primary" type="submit">
            Sauvegarder
          </button>
          <button className="button secondary" type="button" onClick={onCancel}>
            Annuler
          </button>
        </div>
      </form>
    );
  }

  return (
    <article className="template-card template-card--view">
      <h3 className="template-name">{template.name}</h3>
      <p className="template-description job-meta">{template.description || 'Pas de description'}</p>
      <div className="template-actions">
        <button className="button secondary" type="button" onClick={onEdit}>
          Modifier
        </button>
        <button className="button danger" type="button" onClick={handleDelete}>
          Supprimer
        </button>
      </div>
      <pre className="prompt-preview">{template.prompt}</pre>
    </article>
  );
}
