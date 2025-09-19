import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Accordion } from 'react-bootstrap';
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
      activeKey={expanded ? '0' : null}
      onSelect={(eventKey) => setExpanded(eventKey === '0')}
      className="shadow-sm border-0"
    >
      <Accordion.Item eventKey="0">
        <Accordion.Header>Logs</Accordion.Header>
        <Accordion.Body>
          <pre className="mb-0 bg-light rounded p-3" style={{ maxHeight: 260, overflow: 'auto' }}>
            {logs.join('\n')}
          </pre>
        </Accordion.Body>
      </Accordion.Item>
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
