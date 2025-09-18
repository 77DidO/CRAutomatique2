import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import ItemTabs from '../components/ItemTabs.jsx';
import { fetchItem } from '../services/api.js';

function computeDiarizationSummary(segments = []) {
  const map = new Map();
  segments.forEach((segment) => {
    const duration = (segment.end - segment.start) || 0;
    map.set(segment.speaker, (map.get(segment.speaker) || 0) + duration);
  });
  return Array.from(map.entries()).map(([speaker, duration]) => ({ speaker, duration }));
}

function ItemDetailPage() {
  const { id, tab = 'overview' } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [segments, setSegments] = useState([]);
  const [summaryHtml, setSummaryHtml] = useState('');

  useEffect(() => {
    fetchItem(id)
      .then((data) => {
        setItem(data);
        const segmentResource = data.resources?.find((resource) => resource.type === 'segments.json');
        if (segmentResource) {
          fetch(segmentResource.url)
            .then((response) => response.json())
            .then(setSegments)
            .catch(() => setSegments([]));
        }
        const summaryResource = data.resources?.find((resource) => resource.type === 'summary.html');
        if (summaryResource) {
          fetch(summaryResource.url)
            .then((response) => response.text())
            .then(setSummaryHtml)
            .catch(() => setSummaryHtml(''));
        }
      })
      .catch(() => navigate('/history'));
  }, [id, navigate]);

  const diarization = useMemo(() => computeDiarizationSummary(segments), [segments]);

  if (!item) {
    return <p>Chargement...</p>;
  }

  const renderContent = () => {
    switch (tab) {
      case 'overview':
        return (
          <Paper elevation={0} sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h5">{item.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Créé le {new Date(item.createdAt).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gabarit : {item.template || '—'}
                </Typography>
              </Box>
              {summaryHtml ? (
                <Box
                  sx={{ typography: 'body1' }}
                  dangerouslySetInnerHTML={{ __html: summaryHtml }}
                />
              ) : item.summary ? (
                <Typography>{item.summary}</Typography>
              ) : (
                <Typography color="text.secondary">Résumé non disponible.</Typography>
              )}
              {item.resources?.length > 0 && (
                <Stack spacing={1.5}>
                  <Typography variant="subtitle1">Téléchargements</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {item.resources.map((resource) => (
                      <Button
                        key={resource.url}
                        component="a"
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        variant="outlined"
                      >
                        {resource.type}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              )}
            </Stack>
          </Paper>
        );
      case 'audio': {
        const audioResource = item.resources?.find((resource) => resource.type === item.originalFilename);
        return (
          <Paper elevation={0} sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h5">Source audio</Typography>
              {audioResource ? (
                <Box component="audio" controls src={audioResource.url} sx={{ width: '100%' }} />
              ) : (
                <Typography color="text.secondary">Audio non disponible.</Typography>
              )}
            </Stack>
          </Paper>
        );
      }
      case 'texts':
        return (
          <Paper elevation={0} sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h5">Transcriptions</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle1">Brut</Typography>
                    <Box
                      component="iframe"
                      title="transcription-brute"
                      src={`/api/assets/${item.id}/transcription_raw.txt`}
                      sx={{
                        width: '100%',
                        minHeight: 260,
                        borderRadius: 2,
                        border: (theme) => `1px solid ${theme.palette.divider}`
                      }}
                    />
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle1">Nettoyé</Typography>
                    <Box
                      component="iframe"
                      title="transcription-nettoyee"
                      src={`/api/assets/${item.id}/transcription_clean.txt`}
                      sx={{
                        width: '100%',
                        minHeight: 260,
                        borderRadius: 2,
                        border: (theme) => `1px solid ${theme.palette.divider}`
                      }}
                    />
                  </Stack>
                </Grid>
              </Grid>
            </Stack>
          </Paper>
        );
      case 'markdown':
        return (
          <Paper elevation={0} sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h5">Compte rendu Markdown</Typography>
              <Box
                component="iframe"
                title="markdown"
                src={`/api/assets/${item.id}/summary.md`}
                sx={{
                  width: '100%',
                  minHeight: 260,
                  borderRadius: 2,
                  border: (theme) => `1px solid ${theme.palette.divider}`
                }}
              />
            </Stack>
          </Paper>
        );
      case 'vtt':
        return (
          <Paper elevation={0} sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h5">Sous-titres WebVTT</Typography>
              <Box
                component="iframe"
                title="vtt"
                src={`/api/assets/${item.id}/subtitles.vtt`}
                sx={{
                  width: '100%',
                  minHeight: 260,
                  borderRadius: 2,
                  border: (theme) => `1px solid ${theme.palette.divider}`
                }}
              />
            </Stack>
          </Paper>
        );
      default:
        return <Typography>Onglet inconnu</Typography>;
    }
  };

  return (
    <Stack spacing={3}>
      <ItemTabs />
      {diarization.length > 0 ? (
        <Paper elevation={0} sx={{ p: 3 }}>
          <Stack spacing={1.5}>
            <Typography variant="h6">Diarisation</Typography>
            <Stack spacing={1}>
              {diarization.map((entry) => (
                <Stack
                  key={entry.speaker}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    px: 2,
                    py: 1.5
                  }}
                >
                  <Typography fontWeight={600}>{entry.speaker}</Typography>
                  <Typography color="text.secondary">{entry.duration.toFixed(1)}s</Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Paper>
      ) : (
        <Typography color="text.secondary">Aucune information de diarisation.</Typography>
      )}
      {renderContent()}
    </Stack>
  );
}

export default ItemDetailPage;
