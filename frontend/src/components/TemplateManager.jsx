import React, { useMemo, useState } from 'react';
import useHistoryRowMenu from '../hooks/useHistoryRowMenu.js';

const emptyTemplate = { name: '', description: '', prompt: '' };

export default function TemplateManager({ templates, onCreate, onUpdate, onDelete }) {
  const [newTemplate, setNewTemplate] = useState(emptyTemplate);
  const [mode, setMode] = useState('list');
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { registerMenuRef, toggleMenu, closeMenu, isMenuOpen, isDropup } = useHistoryRowMenu();

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const sorted = [...templates].sort((a, b) => a.name.localeCompare(b.name));

    if (!normalizedQuery) {
      return sorted;
    }

    return sorted.filter((template) => {
      const name = template.name?.toLowerCase() ?? '';
      const description = template.description?.toLowerCase() ?? '';
      const prompt = template.prompt?.toLowerCase() ?? '';

      return (
        name.includes(normalizedQuery) ||
        description.includes(normalizedQuery) ||
        prompt.includes(normalizedQuery)
      );
    });
  }, [searchQuery, templates]);

  const isListMode = mode === 'list';
  const isCreateMode = mode === 'create';
  const isEditMode = typeof mode === 'object' && mode?.type === 'edit';
  const editingTemplate = isEditMode
    ? templates.find((item) => item.id === mode.template.id) ?? mode.template
    : null;

  const detailTitleId = isCreateMode
    ? 'template-create-title'
    : editingTemplate
      ? `template-edit-title-${editingTemplate.id}`
      : undefined;

  const handleBackToList = () => {
    setMode('list');
    setError(null);
    setNewTemplate(emptyTemplate);
  };

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
      handleBackToList();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdate = async (template) => {
    if (!editingTemplate) return;
    try {
      await onUpdate(editingTemplate.id, template);
      handleBackToList();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="history-stack">
      {isListMode && (
        <div className="surface-card space-y-6">
          <div className="template-manager-header">
            <h2 className="section-title">Gabarits de synthèse</h2>
            <div className="template-manager-header-actions">
              <label className="sr-only" htmlFor="template-search">
                Rechercher un gabarit
              </label>
              <input
                id="template-search"
                type="search"
                className="input input-sm template-manager-search"
                placeholder="Rechercher"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSearchQuery('')}
                  aria-label="Effacer le filtre"
                >
                  Effacer
                </button>
              )}
              <button
                className="btn btn-primary btn-md"
                type="button"
                onClick={() => {
                  setError(null);
                  setNewTemplate(emptyTemplate);
                  setMode('create');
                }}
              >
                Créer un gabarit
              </button>
            </div>
          </div>
          {error && <div className="alert alert--error">{error}</div>}

          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th scope="col">Nom</th>
                  <th scope="col">Description</th>
                  <th scope="col">Prompt</th>
                  <th scope="col" className="history-row-menu-header">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {templates.length === 0 && (
                  <tr>
                    <td className="history-empty" colSpan={4}>
                      Aucun gabarit n'est disponible pour le moment.
                    </td>
                  </tr>
                )}
                {templates.length > 0 && filteredTemplates.length === 0 && (
                  <tr>
                    <td className="history-empty" colSpan={4}>
                      Aucun gabarit ne correspond à votre recherche.
                    </td>
                  </tr>
                )}
                {filteredTemplates.map((template) => {
                  const promptText = template.prompt ?? '';
                  const promptPreview =
                    promptText.length > 160 ? `${promptText.slice(0, 160)}…` : promptText;
                  const menuOpen = isMenuOpen(template.id);
                  const dropup = isDropup(template.id);

                  return (
                    <tr
                      key={template.id}
                      className={
                        isEditMode && editingTemplate?.id === template.id ? 'is-editing' : ''
                      }
                    >
                      <td>{template.name}</td>
                      <td>{template.description || 'Pas de description'}</td>
                      <td className="template-prompt-preview">
                        <span
                          className="template-prompt-preview-text text-base-content/70"
                          title={promptText}
                          aria-label={promptText}
                        >
                          {promptPreview}
                        </span>
                      </td>
                      <td className="history-row-menu-cell">
                        <div className="history-row-menu" ref={registerMenuRef(template.id)}>
                          <button
                            type="button"
                            className="history-row-menu-trigger btn btn-ghost btn-icon"
                            aria-haspopup="true"
                            aria-expanded={menuOpen}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleMenu(template.id);
                            }}
                          >
                            <span className="sr-only">Afficher les actions</span>
                            <span aria-hidden="true">⋮</span>
                          </button>
                          {menuOpen && (
                            <div
                              className={`history-row-menu__content${
                                dropup ? ' history-row-menu__content--dropup' : ''
                              }`}
                              role="menu"
                            >
                              <button
                                type="button"
                                className="history-row-menu__item"
                                role="menuitem"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  closeMenu();
                                  setError(null);
                                  setMode({ type: 'edit', template });
                                }}
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                className="history-row-menu__item history-row-menu__item--danger"
                                role="menuitem"
                                onClick={async (event) => {
                                  event.stopPropagation();
                                  closeMenu();
                                  if (window.confirm(`Supprimer le gabarit "${template.name}" ?`)) {
                                    await onDelete(template.id);
                                  }
                                }}
                              >
                                Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {(isCreateMode || editingTemplate) && (
        <div className="surface-card history-detail-card">
          <div className="history-detail-toolbar">
            <button className="btn btn-secondary btn-sm" type="button" onClick={handleBackToList}>
              Retour à la liste
            </button>
          </div>
          <div className="history-detail">
            <div className="history-detail-header">
              <h3 className="history-detail-title section-title" id={detailTitleId}>
                {isCreateMode
                  ? 'Créer un gabarit'
                  : editingTemplate
                    ? `Modifier "${editingTemplate.name}"`
                    : ''}
              </h3>
              {error && <div className="alert alert--error">{error}</div>}
            </div>
            {isCreateMode ? (
              <form className="template-form" onSubmit={handleCreate} aria-labelledby={detailTitleId}>
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
                    onClick={handleBackToList}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <TemplateEditor
                key={editingTemplate?.id}
                template={editingTemplate}
                onCancel={handleBackToList}
                onDelete={async () => {
                  if (!editingTemplate) return;
                  if (window.confirm(`Supprimer le gabarit "${editingTemplate.name}" ?`)) {
                    await onDelete(editingTemplate.id);
                    handleBackToList();
                  }
                }}
                onSave={handleUpdate}
                titleId={detailTitleId}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function TemplateEditor({ template, onCancel, onSave, onDelete, titleId }) {
  const [draft, setDraft] = useState(template);

  React.useEffect(() => {
    setDraft(template);
  }, [template]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSave(draft);
  };

  return (
    <form className="template-editor" onSubmit={handleSubmit} aria-labelledby={titleId}>
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
