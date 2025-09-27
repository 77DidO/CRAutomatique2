import React, { useEffect, useMemo, useState } from 'react';

export default function UploadForm({ templates, onSubmit }) {
  const [file, setFile] = useState(null);
  const [participants, setParticipants] = useState([]);
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
      const trimmedPendingParticipant = participantInput.trim();
      const hasPendingParticipant = Boolean(trimmedPendingParticipant);
      const nextParticipants = hasPendingParticipant
        ? participants.includes(trimmedPendingParticipant)
          ? participants
          : [...participants, trimmedPendingParticipant]
        : participants;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('participants', nextParticipants.join(', '));
      formData.append('templateId', templateId);
      await onSubmit(formData);
      setFile(null);
      setParticipants([]);
      setParticipantInput('');
      setTemplateId(templateOptions[0]?.value || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddParticipant = (value) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return;
    }
    setParticipants((currentParticipants) => {
      if (currentParticipants.includes(trimmedValue)) {
        return currentParticipants;
      }
      return [...currentParticipants, trimmedValue];
    });
  };

  const handleParticipantKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddParticipant(participantInput);
      setParticipantInput('');
    }
  };

  const handleRemoveParticipant = (indexToRemove) => {
    setParticipants((currentParticipants) =>
      currentParticipants.filter((_, index) => index !== indexToRemove),
    );
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
          <input
            id="participants"
            className="input input-bordered"
            type="text"
            placeholder="Ajoutez un participant et appuyez sur Entrée"
            value={participantInput}
            onChange={(event) => setParticipantInput(event.target.value)}
            onKeyDown={handleParticipantKeyDown}
          />
          <p className="form-helper">Appuyez sur Entrée pour ajouter un participant.</p>
          {participants.length > 0 && (
            <div className="participant-badge-list" role="list">
              {participants.map((participant, index) => (
                <span className="participant-badge" key={participant} role="listitem">
                  <span>{participant}</span>
                  <button
                    type="button"
                    className="participant-badge__remove"
                    onClick={() => handleRemoveParticipant(index)}
                    aria-label={`Retirer ${participant}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
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
