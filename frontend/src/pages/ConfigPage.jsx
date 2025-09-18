import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { fetchConfig, updateConfig } from '../services/api.js';

function ConfigPage() {
  const [config, setConfig] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig().then((data) => {
      setConfig(data);
      setDraft(data);
    });
  }, []);

  const hasChanged = useMemo(() => JSON.stringify(config) !== JSON.stringify(draft), [config, draft]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setDraft((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleProviderChange = (providerKey, field) => (event) => {
    const { value } = event.target;
    setDraft((prev) => ({
      ...prev,
      providers: {
        ...(prev.providers || {}),
        [providerKey]: {
          ...(prev.providers?.[providerKey] || {}),
          [field]: value
        }
      }
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const next = await updateConfig(draft);
    setConfig(next);
    setDraft(next);
    setSaving(false);
  };

  if (!draft) {
    return <p>Chargement...</p>;
  }

  const providers = draft.providers || {};
  const chatgpt = providers.chatgpt || {};
  const ollama = providers.ollama || {};

  return (
    <Paper component="form" onSubmit={handleSubmit} elevation={0} sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Typography variant="h5">Configuration</Typography>

        <Stack spacing={2}>
          <Typography variant="h6">Général</Typography>
          <TextField
            label="Gabarit par défaut"
            name="defaultTemplate"
            value={draft.defaultTemplate || ''}
            onChange={handleChange}
            fullWidth
          />
          <TextField
            label="Participants par défaut"
            name="participants"
            value={(draft.participants || []).join(', ')}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                participants: event.target.value
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean)
              }))
            }
            helperText="Séparer les participants par une virgule"
            fullWidth
          />
        </Stack>

        <Stack spacing={2}>
          <Typography variant="h6">Pipeline</Typography>
          <FormControlLabel
            control={<Switch name="diarization" checked={draft.diarization} onChange={handleChange} />}
            label="Activer la diarisation"
          />
          <FormControlLabel
            control={<Switch name="enableSummary" checked={draft.enableSummary} onChange={handleChange} />}
            label="Générer la synthèse Markdown"
          />
        </Stack>

        <Stack spacing={2}>
          <Typography variant="h6">LLM</Typography>
          <FormControl fullWidth>
            <InputLabel id="llm-provider-label">Fournisseur</InputLabel>
            <Select
              labelId="llm-provider-label"
              name="llmProvider"
              value={draft.llmProvider}
              label="Fournisseur"
              onChange={handleChange}
            >
              <MenuItem value="chatgpt">ChatGPT (OpenAI)</MenuItem>
              <MenuItem value="ollama">Ollama</MenuItem>
            </Select>
          </FormControl>

          {draft.llmProvider === 'ollama' ? (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Modèle Ollama"
                  value={ollama.model || ''}
                  onChange={handleProviderChange('ollama', 'model')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Commande Ollama"
                  value={ollama.command || ''}
                  onChange={handleProviderChange('ollama', 'command')}
                  fullWidth
                />
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Modèle ChatGPT"
                  value={chatgpt.model || ''}
                  onChange={handleProviderChange('chatgpt', 'model')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Clé API ChatGPT"
                  type="password"
                  value={chatgpt.apiKey || ''}
                  onChange={handleProviderChange('chatgpt', 'apiKey')}
                  placeholder="sk-..."
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Base URL (optionnel)"
                  value={chatgpt.baseUrl || ''}
                  onChange={handleProviderChange('chatgpt', 'baseUrl')}
                  placeholder="https://api.openai.com/v1"
                  fullWidth
                />
              </Grid>
            </Grid>
          )}
        </Stack>

        <Stack direction="row" justifyContent="flex-end">
          <Button type="submit" disabled={!hasChanged || saving}>
            {saving ? 'Enregistrement...' : 'Sauvegarder'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default ConfigPage;
