import PropTypes from 'prop-types';
import { Link as RouterLink } from 'react-router-dom';
function HistoryTable({ items = [], onDelete = () => {} }) {
  if (!items.length) {
    return <div className="surface-card history-empty">Aucun traitement terminé pour le moment.</div>;
  }
  return (
    <div className="surface-card">
      <div className="history-table-wrapper">
        <table className="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Titre</th>
              <th>Gabarit</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const statusClass =
                item.status === 'done'
                  ? 'text-green-600'
                  : item.status === 'error'
                    ? 'error-text'
                    : 'text-base-content';
              return (
                <tr key={item.id}>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                  <td>{item.title}</td>
                  <td>{item.template || '—'}</td>
                  <td className={`text-sm font-medium ${statusClass}`}>
                    {item.status.toUpperCase()}
                  </td>
                  <td>
                    <div className="status-actions status-actions--end">
                      <RouterLink to={`/item/${item.id}`} className="btn btn-secondary btn-sm">
                        Consulter
                      </RouterLink>
                      <button
                        type="button"
                        className="btn btn-error btn-sm"
                        onClick={() => onDelete(item.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
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

export default HistoryTable;
