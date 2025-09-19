import PropTypes from 'prop-types';
import { Link as RouterLink } from 'react-router-dom';
import { Button, Card, Stack, Table } from 'react-bootstrap';

function HistoryTable({ items, onDelete }) {
  if (!items.length) {
    return (
      <Card className="shadow-sm border-0">
        <Card.Body className="text-center text-muted">
          Aucun traitement terminé pour le moment.
        </Card.Body>
      </Card>
    );
  }
  return (
    <Card className="shadow-sm border-0">
      <Card.Body className="p-0">
        <Table responsive hover className="mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th>Date</th>
              <th>Titre</th>
              <th>Gabarit</th>
              <th>Status</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.createdAt).toLocaleString()}</td>
                <td>{item.title}</td>
                <td>{item.template || '—'}</td>
                <td className="text-uppercase fw-semibold">
                  <span
                    className={
                      item.status === 'done'
                        ? 'text-success'
                        : item.status === 'error'
                          ? 'text-danger'
                          : 'text-body'
                    }
                  >
                    {item.status}
                  </span>
                </td>
                <td>
                  <Stack direction="horizontal" gap={2} className="justify-content-end">
                    <Button as={RouterLink} to={`/item/${item.id}`} size="sm">
                      Consulter
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => onDelete(item.id)}
                    >
                      Supprimer
                    </Button>
                  </Stack>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}

HistoryTable.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      createdAt: PropTypes.string,
      title: PropTypes.string,
      template: PropTypes.string,
      status: PropTypes.string
    })
  ),
  onDelete: PropTypes.func
};

HistoryTable.defaultProps = {
  items: [],
  onDelete: () => {}
};

export default HistoryTable;
