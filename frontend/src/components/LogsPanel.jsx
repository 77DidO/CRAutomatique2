import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { fetchLogs } from '../services/api.js';

function LogsPanel({ jobId, polling }) {
  const [logs, setLogs] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!jobId) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchLogs(jobId);
        if (!cancelled) {
          setLogs(data);
        }
      } catch (error) {
        console.error(error);
      }
    };
    load();
    if (!polling) {
      return () => {
        cancelled = true;
      };
    }
    const id = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [jobId, polling]);

  if (!jobId) {
    return null;
  }

  return (
    <Accordion
      elevation={0}
      disableGutters
      expanded={expanded}
      onChange={() => setExpanded((prev) => !prev)}
      sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 3 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1">Logs</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box
          component="pre"
          sx={{
            m: 0,
            maxHeight: 260,
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.85rem'
          }}
        >
          {logs.join('\n')}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

LogsPanel.propTypes = {
  jobId: PropTypes.string,
  polling: PropTypes.bool
};

LogsPanel.defaultProps = {
  jobId: null,
  polling: false
};

export default LogsPanel;
