import { useEffect, useState } from 'react';
import HistoryTable from '../components/HistoryTable.jsx';
import { deleteItem, fetchItems } from '../services/api.js';

function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchItems();
      setItems(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce traitement et tous ses fichiers ?')) {
      return;
    }
    await deleteItem(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="status-line">
        <div>
          <h1 className="page-title">Historique des traitements</h1>
        </div>
        <div className="status-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
            Actualiser
          </button>
        </div>
      </div>
      {loading ? <p className="text-base-content/70">Chargement…</p> : <HistoryTable items={items} onDelete={handleDelete} />}
    </div>
  );
}

export default HistoryPage;
