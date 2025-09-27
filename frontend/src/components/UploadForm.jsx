import React, { useEffect, useMemo, useState } from 'react';

export default function UploadForm({ templates, onSubmit }) {
  const [file, setFile] = useState(null);
  const [participantsList, setParticipantsList] = useState([]);
  const [participantInput, setParticipantInput] = useState('');
  const [templateId, setTemplateId] = useState(templates[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const templateOptions = useMemo(() => templates.map((tpl) => ({ value: tpl.id, label: tpl.name })), [templates]);

  useEffect(() => {
    if (!templateId && templateOptions[0]) {
      setTemplateId(templateOptions[0].value);
    }
  }, [templateOptions, templateId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Veuillez sélectionner un fichier audio.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('participants', JSON.stringify(participantsList));
      formData.append('templateId', templateId);
      await onSubmit(formData);
      setFile(null);
      setParticipantsList([]);
      setParticipantInput('');
      setTemplateId(templateOptions[0]?.value || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addParticipant = () => {
    const trimmed = participantInput.trim();
    if (!trimmed) {
      return;
    }
    setParticipantsList((current) => [...current, trimmed]);
    setParticipantInput('');
  };

  const removeParticipantAt = (indexToRemove) => {
    setParticipantsList((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const handleParticipantKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addParticipant();
    }
  };

  return (
    <section className="surface-card space-y-6" aria-label="Formulaire d'import">
      <div>
        <h2 className="section-title">Importer un nouvel enregistrement</h2>
        <p className="text-base-content/70">
          Les fichiers sont traités localement via FFmpeg et Whisper, puis enrichis avec OpenAI.
          Les exports restent identiques à la version précédente (TXT, Markdown et VTT).
        </p>
      </div>

      <form className="upload-form space-y-6" onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="form-label" htmlFor="file">
            Fichier audio
          </label>
          <input
            id="file"
            className="file-input file-input-bordered"
            type="file"
            accept="audio/*,video/*"
            onChange={(event) => setFile(event.target.files[0] || null)}
            required
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="participants">
            Participants
          </label>
          <div className="space-y-3">
            <div className="join">
              <input
                id="participants"
                className="input input-bordered join-item"
                type="text"
                placeholder="Ajouter un participant"
                value={participantInput}
                onChange={(event) => setParticipantInput(event.target.value)}
                onKeyDown={handleParticipantKeyDown}
              />
              <button type="button" className="btn btn-secondary join-item" onClick={addParticipant}>
                Ajouter
              </button>
            </div>
            {participantsList.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {participantsList.map((participant, index) => (
                  <span key={`${participant}-${index}`} className="badge badge-neutral gap-2">
                    <span>{participant}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      aria-label={`Supprimer ${participant}`}
                      onClick={() => removeParticipantAt(index)}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-base-content/70">Ajoutez les prénoms ou noms des intervenants.</p>
            )}
          </div>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="template">
            Gabarit de synthèse
          </label>
          <select
            id="template"
            className="select select-bordered"
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
          >
            {templateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary btn-md" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Envoi en cours…' : 'Lancer le traitement'}
        </button>
      </form>
    </section>
  );
}
