import { useEffect, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
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
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5">Historique des traitements</Typography>
        <Button onClick={load}>Actualiser</Button>
      </Stack>
      {loading ? <Typography>Chargement...</Typography> : <HistoryTable items={items} onDelete={handleDelete} />}
    </Stack>
  );
}

export default HistoryPage;
