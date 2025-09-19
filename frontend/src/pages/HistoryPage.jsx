import { useCallback, useEffect, useState } from 'react';
import HistoryTable from '../components/HistoryTable.jsx';
import { deleteItem, fetchItems } from '../services/api.js';

function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchItems();
      const sorted = [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setItems(sorted);
    } catch (error) {
      console.error('Impossible de charger l\'historique.', error);
      setItems([]);
      setError("Impossible de récupérer l'historique. Vérifiez la connexion au serveur et réessayez.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Supprimer ce traitement et tous ses fichiers ?')) {
      return;
    }
    try {
      await deleteItem(id);
      await load();
    } catch (deleteError) {
      console.error('Impossible de supprimer le traitement.', deleteError);
      setError("La suppression a échoué. Réessayez dans quelques instants.");
    }
  }, [load]);

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
      {loading ? (
        <p className="text-base-content/70">Chargement…</p>
      ) : error ? (
        <p role="alert" className="status-message error-text">
          {error}
        </p>
      ) : (
        <HistoryTable items={items} onDelete={handleDelete} />
      )}
    </div>
  );
}

export default HistoryPage;
