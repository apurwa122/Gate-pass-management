export const prettyDate = (d) =>
  d
    ? new Date(`${d}T12:00:00`).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
export const prettyTime = (d) =>
  d
    ? new Date(d.endsWith('Z') ? d : `${d.replace(' ', 'T')}Z`).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
