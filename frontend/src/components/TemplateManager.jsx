import React, { useMemo, useState } from 'react';

const emptyTemplate = { name: '', description: '', prompt: '' };

export default function TemplateManager({ templates, onCreate, onUpdate, onDelete }) {
  const [newTemplate, setNewTemplate] = useState(emptyTemplate);
  const [isCreating, setIsCreating] = useState(false);
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
      setIsCreating(false);
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
    <section className="history-stack">
      <div className="surface-card space-y-6">
        <div className="template-manager-header">
          <h2 className="section-title">Gabarits de synthèse</h2>
          <button
            className="btn btn-primary btn-md"
            type="button"
            onClick={() => {
              setError(null);
              setIsCreating((prev) => {
                if (prev) {
                  setNewTemplate(emptyTemplate);
                }
                return !prev;
              });
            }}
          >
            {isCreating ? 'Fermer' : 'Créer un gabarit'}
          </button>
        </div>
        {error && <div className="alert alert--error">{error}</div>}

        {isCreating && (
          <form className="template-form" onSubmit={handleCreate}>
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
            <div className="template-actions">
              <button className="btn btn-primary btn-md" type="submit">
                Créer
              </button>
              <button
                className="btn btn-secondary btn-md"
                type="button"
                onClick={() => {
                  setNewTemplate(emptyTemplate);
                  setIsCreating(false);
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th scope="col">Nom</th>
                <th scope="col">Description</th>
                <th scope="col">Prompt</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTemplates.length === 0 && (
                <tr>
                  <td className="history-empty" colSpan={4}>
                    Aucun gabarit n'est disponible pour le moment.
                  </td>
                </tr>
              )}
              {sortedTemplates.map((template) => (
                <tr key={template.id} className={editing?.id === template.id ? 'is-editing' : ''}>
                  <td>{template.name}</td>
                  <td>{template.description || 'Pas de description'}</td>
                  <td className="template-prompt-preview">
                    <pre>{template.prompt}</pre>
                  </td>
                  <td className="history-table-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      type="button"
                      onClick={() => setEditing(template)}
                    >
                      Modifier
                    </button>
                    <button
                      className="btn btn-error btn-sm"
                      type="button"
                      onClick={async () => {
                        if (window.confirm(`Supprimer le gabarit "${template.name}" ?`)) {
                          await onDelete(template.id);
                        }
                      }}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editing && (
          <TemplateEditor
            key={editing.id}
            template={editing}
            onCancel={() => setEditing(null)}
            onDelete={async () => {
              if (window.confirm(`Supprimer le gabarit "${editing.name}" ?`)) {
                await onDelete(editing.id);
                setEditing(null);
              }
            }}
            onSave={handleUpdate}
          />
        )}
      </div>
    </section>
  );
}

function TemplateEditor({ template, onCancel, onSave, onDelete }) {
  const [draft, setDraft] = useState(template);

  React.useEffect(() => {
    setDraft(template);
  }, [template]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSave(draft);
  };

  return (
    <form className="template-editor" onSubmit={handleSubmit}>
      <h3 className="section-title">Modifier "{template.name}"</h3>
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
          value={draft.description ?? ''}
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
        <button className="btn btn-error btn-sm" type="button" onClick={onDelete}>
          Supprimer
        </button>
      </div>
    </form>
  );
}
