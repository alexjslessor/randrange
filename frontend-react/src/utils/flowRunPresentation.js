

const getFlowRunStateLabel = (
  flowRun,
  {
    uppercase = false,
    fallback = 'Unknown',
  } = {},
) => {
  const raw = flowRun?.state_name
    || flowRun?.state?.name
    || flowRun?.state_type
    || flowRun?.state?.type
    || fallback;
  const label = String(raw || fallback).trim() || fallback;
  return uppercase ? label.toUpperCase() : label;
};

const resolveLogChipColor = (level) => {
  const value = String(level || '').toUpperCase();
  if (value.includes('ERROR') || value.includes('CRITICAL')) return 'error';
  if (value.includes('WARN')) return 'warning';
  if (value.includes('DEBUG')) return 'secondary';
  if (value.includes('INFO')) return 'info';
  return 'default';
};

const resolveRunChipColor = (flowRun) => {
  const value = getFlowRunStateLabel(flowRun, { uppercase: true });
  if (value.includes('FAILED') || value.includes('CRASHED') || value.includes('CANCELLED')) return 'error';
  if (value.includes('RUNNING')) return 'success';
  if (value.includes('PENDING') || value.includes('SCHEDULED')) return 'warning';
  if (value.includes('COMPLETED')) return 'cyberAqua';
  return 'default';
};

const formatDurationSeconds = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 'Unknown';
  if (number < 60) return `${number.toFixed(0)}s`;
  const minutes = Math.floor(number / 60);
  const seconds = Math.floor(number % 60);
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

export {
  formatDurationSeconds,
  getFlowRunStateLabel,
  resolveLogChipColor,
  resolveRunChipColor,
};
