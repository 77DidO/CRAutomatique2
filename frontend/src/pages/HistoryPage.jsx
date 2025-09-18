import { useEffect, useState } from 'react';
import HistoryTable from '../components/HistoryTable.jsx';
import { deleteItem, fetchItems } from '../services/api.js';
import './HistoryPage.css';

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
    <div className="history-page">
      <header>
        <h2>Historique des traitements</h2>
        <button type="button" onClick={load}>
          Actualiser
        </button>
      </header>
      {loading ? <p>Chargement...</p> : <HistoryTable items={items} onDelete={handleDelete} />}
    </div>
  );
}

export default HistoryPage;
