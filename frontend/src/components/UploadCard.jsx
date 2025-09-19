import { useEffect, useMemo, useState } from 'react';
import { createItem } from '../services/api.js';

function UploadCard({ templates = [], defaultTemplate, onCreated }) {
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState('');
  const [participants, setParticipants] = useState('');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const availableTemplates = useMemo(() => {
    return [...templates].sort((a, b) => a.label.localeCompare(b.label));
  }, [templates]);

  useEffect(() => {
    if (!availableTemplates.length) {
      setTemplate('');
      return;
    }
    const preferred =
      (defaultTemplate && availableTemplates.some((item) => item.id === defaultTemplate)
        ? defaultTemplate
        : availableTemplates[0].id) || '';
    setTemplate((current) => {
      if (current && availableTemplates.some((item) => item.id === current)) {
        return current;
      }
      return preferred;
    });
  }, [defaultTemplate, availableTemplates]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Veuillez sélectionner un fichier audio.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (title.trim()) {
        formData.append('title', title.trim());
      }
      if (template) {
        formData.append('template', template);
      }
      if (participants.trim()) {
        formData.append('participants', participants.trim());
      }

      const job = await createItem(formData);
      setSuccess(true);
      setFile(null);
      setTitle('');
      setParticipants('');
      if (onCreated) {
        onCreated(job);
      }
    } catch (submitError) {
      setError("Impossible de créer le compte rendu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Nouveau compte rendu</h2>
        <p className="card__subtitle">Importez un enregistrement audio pour lancer un traitement.</p>
      </header>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span>Titre du dossier</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Réunion du 12 avril"
          />
        </label>

        <label className="form__field">
          <span>Modèle de compte rendu</span>
          <select value={template} onChange={(event) => setTemplate(event.target.value)} disabled={!availableTemplates.length}>
            {!availableTemplates.length && <option value="">Aucun modèle disponible</option>}
            {availableTemplates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form__field">
          <span>Participants (séparés par une virgule)</span>
          <input
            type="text"
            value={participants}
            onChange={(event) => setParticipants(event.target.value)}
            placeholder="Alice, Bob, Charlie"
          />
        </label>

        <label className="form__field">
          <span>Fichier audio</span>
          <input type="file" accept="audio/*" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </label>

        {error && <p className="form__error">{error}</p>}
        {success && <p className="form__success">Traitement enregistré !</p>}

        <button className="btn btn-primary" type="submit" disabled={isSubmitting || !template}>
          {isSubmitting ? 'Envoi en cours…' : 'Démarrer le traitement'}
        </button>
      </form>
    </section>
  );
}

export default UploadCard;
