import PropTypes from 'prop-types';
import { Button, Card, Stack } from 'react-bootstrap';

function ResourceList({ resources }) {
  if (!resources?.length) {
    return null;
  }
  return (
    <Card className="shadow-sm border-0">
      <Card.Body>
        <h6 className="mb-3">Ressources générées</h6>
        <Stack direction="horizontal" gap={2} className="flex-wrap">
          {resources.map((resource) => (
            <Button
              key={resource.url}
              as="a"
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              variant="outline-primary"
            >
              {resource.type}
            </Button>
          ))}
        </Stack>
      </Card.Body>
    </Card>
  );
}

ResourceList.propTypes = {
  resources: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string,
      url: PropTypes.string
    })
  )
};

ResourceList.defaultProps = {
  resources: []
};

export default ResourceList;
