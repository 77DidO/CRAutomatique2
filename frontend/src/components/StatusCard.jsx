import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Typography
} from '@mui/material';

const STEP_ORDER = ['queued', 'preconvert', 'transcribe', 'clean', 'summarize', 'done'];

function StatusCard({ job }) {
  if (!job) {
    return (
      <Card elevation={0} sx={{ p: 2.5 }}>
        <CardContent>
          <Typography color="text.secondary">Aucun traitement en cours.</Typography>
        </CardContent>
      </Card>
    );
  }
  const currentIndex = STEP_ORDER.indexOf(job.status);
  return (
    <Card elevation={0} sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h6" component="h2">
            {job.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gabarit :{' '}
            <Box component="span" fontWeight={600} color="text.primary">
              {job.template || '—'}
            </Box>
          </Typography>
          {job.participants?.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" mt={1.5}>
              {job.participants.map((participant) => (
                <Chip key={participant} label={participant} color="secondary" variant="outlined" size="small" />
              ))}
            </Stack>
          )}
        </Box>
        <Chip
          label={job.status.toUpperCase()}
          color={job.status === 'error' ? 'error' : job.status === 'done' ? 'success' : 'primary'}
          variant={job.status === 'queued' ? 'outlined' : 'filled'}
          sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
        />
      </Stack>

      <Box>
        <LinearProgress
          variant={typeof job.progress === 'number' ? 'determinate' : 'indeterminate'}
          value={job.progress || 0}
          sx={{ borderRadius: 999, height: 10 }}
        />
      </Box>

      <Stack direction="row" flexWrap="wrap" gap={1}>
        {STEP_ORDER.map((step, index) => (
          <Chip
            key={step}
            label={step}
            size="small"
            color={index <= currentIndex ? 'primary' : 'default'}
            variant={index <= currentIndex ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>

      {job.error && <Alert severity="error">{job.error}</Alert>}

      {job.summary && job.status === 'done' && (
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: (theme) => `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle1" gutterBottom>
            Résumé
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {job.summary.slice(0, 280)}...
          </Typography>
        </Box>
      )}

      <Divider />

      <Typography variant="caption" color="text.secondary">
        Identifiant : {job.id}
      </Typography>
    </Card>
  );
}

StatusCard.propTypes = {
  job: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    status: PropTypes.string,
    template: PropTypes.string,
    participants: PropTypes.arrayOf(PropTypes.string),
    progress: PropTypes.number,
    summary: PropTypes.string,
    error: PropTypes.string
  })
};

StatusCard.defaultProps = {
  job: null
};

export default StatusCard;
