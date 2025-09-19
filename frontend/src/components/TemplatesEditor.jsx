import { useEffect, useState } from 'react';

function createTemplate(template) {
  return {
    id: template?.id || `template-${Math.random().toString(36).slice(2, 8)}`,
    label: template?.label || 'Nouveau modèle',
    description: template?.description || '',
    content: template?.content || ''
  };
}

function TemplatesEditor({ templates = [], onSubmit, isSaving }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(templates.map((template) => createTemplate(template)));
  }, [templates]);

  const updateItem = (id, changes) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  };

  const removeItem = (id) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const addItem = () => {
    setItems((current) => [...current, createTemplate()]);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!onSubmit) {
      return;
    }
    onSubmit(items);
  };

  return (
    <section className="card">
      <header className="card__header">
        <div>
          <h2 className="card__title">Modèles disponibles</h2>
          <p className="card__subtitle">Personnalisez les gabarits utilisés pour la génération des comptes rendus.</p>
        </div>
        <button type="button" className="btn" onClick={addItem}>
          Ajouter un modèle
        </button>
      </header>
      <form className="form" onSubmit={handleSubmit}>
        {items.length === 0 && <p className="empty-placeholder">Aucun modèle configuré.</p>}
        {items.map((item) => (
          <div key={item.id} className="template-editor">
            <div className="template-editor__header">
              <input
                value={item.label}
                onChange={(event) => updateItem(item.id, { label: event.target.value })}
                placeholder="Nom du modèle"
              />
              <button type="button" onClick={() => removeItem(item.id)} className="btn btn-danger btn-ghost">
                Supprimer
              </button>
            </div>
            <textarea
              value={item.description}
              onChange={(event) => updateItem(item.id, { description: event.target.value })}
              placeholder="Description"
              rows={2}
            />
            <textarea
              value={item.content}
              onChange={(event) => updateItem(item.id, { content: event.target.value })}
              placeholder="Contenu du modèle"
              rows={6}
            />
          </div>
        ))}

        <button className="btn btn-primary" type="submit" disabled={isSaving}>
          {isSaving ? 'Enregistrement…' : 'Sauvegarder les modèles'}
        </button>
      </form>
    </section>
  );
}

export default TemplatesEditor;
