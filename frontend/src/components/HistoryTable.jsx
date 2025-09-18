import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import './HistoryTable.css';

function HistoryTable({ items, onDelete }) {
  if (!items.length) {
    return <p className="empty-state">Aucun traitement terminé pour le moment.</p>;
  }
  return (
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
        {items.map((item) => (
          <tr key={item.id}>
            <td>{new Date(item.createdAt).toLocaleString()}</td>
            <td>{item.title}</td>
            <td>{item.template || '—'}</td>
            <td className={`status ${item.status}`}>{item.status}</td>
            <td>
              <div className="actions">
                <Link to={`/item/${item.id}`}>Consulter</Link>
                <button type="button" onClick={() => onDelete(item.id)}>
                  Supprimer
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
