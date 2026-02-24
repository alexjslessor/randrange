import {
  Box,
  Chip,
  Typography,
} from '@mui/material';
import { formatTimestamp } from '@/utils/formatTimestamp';
import {
  getFlowRunStateLabel,
  resolveLogChipColor,
} from '@/utils/flowRunPresentation';

export default function DeploymentLogsPanel({
  flowRun,
  flowRunId = '',
  logs = [],
  isPolling = false,
  isFlowRunLoading = false,
  isFlowRunError = false,
  flowRunError,
  isLogsLoading = false,
  isLogsFetching = false,
  isLogsError = false,
  logsError,
}) {
  const flowRunStateLabel = getFlowRunStateLabel(flowRun);
  const flowRunTimestamp = formatTimestamp(
    flowRun?.start_time
    || flowRun?.expected_start_time
    || flowRun?.created,
  );

  return (
    <Box
      sx={{
        mt: 2,
        borderRadius: 2,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        p: 2,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
        <Typography variant="subtitle2">Latest Flow Run</Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip label={`State: ${flowRunStateLabel}`} variant="outlined" color="cyberAqua" />
          <Chip label={flowRunTimestamp} variant="outlined" color="cyberAqua" />
          {flowRunId ? (
            <Chip label={flowRunId} variant="outlined" color="cyberMag" />
          ) : null}
          {isPolling ? (
            <Chip label="Polling" variant="outlined" color="success" />
          ) : null}
        </Box>
      </Box>

      {isFlowRunLoading ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading flow run details...
        </Typography>
      ) : null}

      {isFlowRunError ? (
        <Typography variant="body2" color="error.main" sx={{ mt: 2 }}>
          {flowRunError?.message || 'Failed to load flow run details'}
        </Typography>
      ) : null}

      {!isFlowRunLoading && !isFlowRunError && !flowRunId ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No flow runs found for this deployment yet.
        </Typography>
      ) : null}

      {flowRunId && isLogsLoading ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading logs...
        </Typography>
      ) : null}

      {flowRunId && isLogsError ? (
        <Typography variant="body2" color="error.main" sx={{ mt: 2 }}>
          {logsError?.message || 'Failed to load logs'}
        </Typography>
      ) : null}

      {flowRunId && !isLogsLoading && !isLogsError && !logs.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No logs available yet.
        </Typography>
      ) : null}

      {flowRunId && logs.length ? (
        <Box
          sx={{
            mt: 2,
            maxHeight: 420,
            overflowY: 'auto',
            pr: 1,
            display: 'grid',
            gap: 1,
          }}
        >
          {logs.map((log, index) => (
            <Box
              key={log.id || `${log.timestamp || 'unknown'}-${index}`}
              sx={{
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                p: 1.5,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
                <Typography variant="caption" color="text.secondary">
                  {formatTimestamp(log.timestamp || log.created)}
                </Typography>
                <Chip
                  size="small"
                  label={String(log.level || 'INFO').toUpperCase()}
                  variant="outlined"
                  color={resolveLogChipColor(log.level)}
                />
              </Box>
              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                }}
              >
                {log.message || '[Empty log message]'}
              </Typography>
              {log.name ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {log.name}
                </Typography>
              ) : null}
            </Box>
          ))}
        </Box>
      ) : null}

      {flowRunId && isLogsFetching ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
          Refreshing logs...
        </Typography>
      ) : null}
    </Box>
  );
}
