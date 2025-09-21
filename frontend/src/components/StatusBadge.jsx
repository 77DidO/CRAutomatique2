import React from 'react';

const LABELS = {
  queued: 'En attente',
  processing: 'En cours',
  completed: 'Terminé',
  failed: 'Échec',
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const label = LABELS[status] || status;
  const className = ['badge'];
  if (status === 'completed') className.push('success');
  if (status === 'processing') className.push('processing');
  if (status === 'failed') className.push('failed');
  return <span className={className.join(' ')}>{label}</span>;
}
