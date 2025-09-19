import { useEffect, useState } from 'react';
import { Button, Stack } from 'react-bootstrap';
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
    <Stack gap={3}>
      <Stack direction="horizontal" className="justify-content-between flex-wrap gap-2">
        <h4 className="mb-0">Historique des traitements</h4>
        <Button onClick={load}>Actualiser</Button>
      </Stack>
      {loading ? <p>Chargement...</p> : <HistoryTable items={items} onDelete={handleDelete} />}
    </Stack>
  );
}

export default HistoryPage;
