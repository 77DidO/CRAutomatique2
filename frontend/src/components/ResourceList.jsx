import PropTypes from 'prop-types';
import { Button, Paper, Stack, Typography } from '@mui/material';

function ResourceList({ resources }) {
  if (!resources?.length) {
    return null;
  }
  return (
    <Paper elevation={0} sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle1">Ressources générées</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {resources.map((resource) => (
            <Button
              key={resource.url}
              component="a"
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              variant="outlined"
            >
              {resource.type}
            </Button>
          ))}
        </Stack>
      </Stack>
    </Paper>
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
