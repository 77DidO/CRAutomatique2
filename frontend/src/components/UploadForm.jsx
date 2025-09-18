import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { createItem, fetchTemplates } from '../services/api.js';

function UploadForm({ onCreated, defaultTemplate, defaultParticipants }) {
  const [file, setFile] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState(defaultTemplate);
  const [participants, setParticipants] = useState(defaultParticipants.join(', '));
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates().then(setTemplates);
  }, []);

  useEffect(() => {
    setTemplate(defaultTemplate);
  }, [defaultTemplate]);

  useEffect(() => {
    setParticipants(defaultParticipants.join(', '));
  }, [defaultParticipants]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Veuillez sélectionner un fichier audio ou vidéo.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('template', template || '');
      formData.append('participants', participants);
      formData.append('title', title);
      const job = await createItem(formData);
      onCreated(job);
      setFile(null);
      setTitle('');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const participantList = useMemo(
    () =>
      participants
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    [participants]
  );

  return (
    <Paper component="form" onSubmit={handleSubmit} elevation={0} sx={{ p: 3, width: '100%' }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Fichier audio / vidéo
          </Typography>
          <Button component="label" startIcon={<CloudUploadIcon />} variant="outlined">
            {file ? 'Changer de fichier' : 'Sélectionner un fichier'}
            <input
              id="file"
              type="file"
              accept="audio/*,video/*"
              hidden
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </Button>
          {file && (
            <Typography variant="body2" color="text.secondary">
              {file.name}
            </Typography>
          )}
        </Stack>

        <TextField
          id="title"
          label="Titre"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Nom du traitement"
          fullWidth
        />

        <FormControl fullWidth>
          <InputLabel id="template-label">Gabarit</InputLabel>
          <Select
            labelId="template-label"
            id="template"
            value={template}
            label="Gabarit"
            onChange={(event) => setTemplate(event.target.value)}
          >
            <MenuItem value="">
              <em>-- Choisir --</em>
            </MenuItem>
            {templates.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack spacing={1}>
          <TextField
            id="participants"
            label="Participants"
            value={participants}
            onChange={(event) => setParticipants(event.target.value)}
            placeholder="Liste séparée par des virgules"
            fullWidth
          />
          {participantList.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {participantList.map((participant) => (
                <Chip key={participant} label={participant} color="secondary" variant="outlined" />
              ))}
            </Box>
          )}
        </Stack>

        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Button type="submit" disabled={loading} size="large">
          {loading ? 'Traitement en cours...' : 'Lancer le traitement'}
        </Button>
      </Stack>
    </Paper>
  );
}

UploadForm.propTypes = {
  onCreated: PropTypes.func.isRequired,
  defaultTemplate: PropTypes.string,
  defaultParticipants: PropTypes.arrayOf(PropTypes.string)
};

UploadForm.defaultProps = {
  defaultTemplate: '',
  defaultParticipants: []
};

export default UploadForm;
