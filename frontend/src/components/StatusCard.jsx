import PropTypes from 'prop-types';
import { Alert, Badge, Card, ProgressBar, Stack } from 'react-bootstrap';

const STEP_ORDER = ['queued', 'preconvert', 'transcribe', 'clean', 'summarize', 'done'];

function StatusCard({ job }) {
  if (!job) {
    return (
      <Card className="shadow-sm border-0">
        <Card.Body className="text-muted">Aucun traitement en cours.</Card.Body>
      </Card>
    );
  }
  const currentIndex = STEP_ORDER.indexOf(job.status);
  return (
    <Card className="shadow-sm border-0">
      <Card.Body className="d-flex flex-column gap-3">
        <Stack direction="horizontal" className="flex-wrap gap-3 justify-content-between">
          <div>
            <h5 className="mb-1">{job.title}</h5>
            <div className="text-muted small">
              Gabarit : <span className="fw-semibold text-dark">{job.template || '—'}</span>
            </div>
            {job.participants?.length > 0 && (
              <Stack direction="horizontal" gap={2} className="flex-wrap mt-2">
                {job.participants.map((participant) => (
                  <Badge key={participant} bg="secondary" text="light" pill>
                    {participant}
                  </Badge>
                ))}
              </Stack>
            )}
          </div>
          <Badge
            bg={job.status === 'error' ? 'danger' : job.status === 'done' ? 'success' : 'primary'}
            className="align-self-start text-uppercase"
          >
            {job.status}
          </Badge>
        </Stack>

        <div>
          <ProgressBar
            now={typeof job.progress === 'number' ? job.progress : 100}
            animated={typeof job.progress !== 'number'}
            className="rounded-pill"
          />
        </div>

        <Stack direction="horizontal" gap={2} className="flex-wrap">
          {STEP_ORDER.map((step, index) => (
            <Badge
              key={step}
              bg={index <= currentIndex ? 'primary' : 'light'}
              text={index <= currentIndex ? undefined : 'dark'}
              className={`text-uppercase ${index > currentIndex ? 'border border-primary-subtle' : ''}`}
            >
              {step}
            </Badge>
          ))}
        </Stack>

        {job.error && <Alert variant="danger">{job.error}</Alert>}

        {job.summary && job.status === 'done' && (
          <div className="border rounded-4 p-3 bg-white">
            <h6 className="mb-2">Résumé</h6>
            <p className="mb-0 text-muted">{job.summary.slice(0, 280)}...</p>
          </div>
        )}

        <div className="border-top pt-2 text-muted small">Identifiant : {job.id}</div>
      </Card.Body>
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
