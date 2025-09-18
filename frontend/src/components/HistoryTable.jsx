import PropTypes from 'prop-types';
import { Link as RouterLink } from 'react-router-dom';
import {
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';

function HistoryTable({ items, onDelete }) {
  if (!items.length) {
    return (
      <Paper elevation={0} sx={{ p: 3 }}>
        <Typography color="text.secondary" textAlign="center">
          Aucun traitement terminé pour le moment.
        </Typography>
      </Paper>
    );
  }
  return (
    <TableContainer component={Paper} elevation={0}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Titre</TableCell>
            <TableCell>Gabarit</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} hover>
              <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
              <TableCell>{item.title}</TableCell>
              <TableCell>{item.template || '—'}</TableCell>
              <TableCell>
                <Typography
                  variant="body2"
                  color={item.status === 'done' ? 'success.main' : item.status === 'error' ? 'error.main' : 'text.primary'}
                  fontWeight={600}
                  textTransform="uppercase"
                >
                  {item.status}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button component={RouterLink} to={`/item/${item.id}`} size="small">
                    Consulter
                  </Button>
                  <Button color="error" variant="outlined" size="small" onClick={() => onDelete(item.id)}>
                    Supprimer
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
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
