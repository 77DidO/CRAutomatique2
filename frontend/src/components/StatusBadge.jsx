import React from 'react';

const LABELS = {
  queued: 'En attente',
  processing: 'En cours',
  completed: 'Terminé',
  failed: 'Échec',
};

const CLASSNAMES = {
  completed: 'status-pill status-pill--completed',
  processing: 'status-pill status-pill--processing',
  failed: 'status-pill status-pill--failed',
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const label = LABELS[status] || status;
  const className = CLASSNAMES[status] || 'status-pill';
  return <span className={className}>{label}</span>;
}
