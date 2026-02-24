import {
  Box,
  Card,
  CardContent,
  Chip,
  Typography,
} from '@mui/material';
import FlowRunActionsMenu from '@/components/FlowRunActionsMenu';
import { formatTimestamp } from '@/utils/formatTimestamp';
import {
  formatDurationSeconds,
  getFlowRunStateLabel,
  resolveRunChipColor,
} from '@/utils/flowRunPresentation';

export default function FlowRunSummaryCard({
  run,
  onOpenNotes,
}) {
  const runId = String(run?.id || '');
  const runParameters = run?.parameters && typeof run.parameters === 'object'
    ? Object.keys(run.parameters).length
    : 0;
  const runDurationSeconds = run?.total_run_time ?? run?.estimated_run_time ?? null;

  return (
    <Card
      sx={{
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
      }}
    >
      <CardContent sx={{ pb: 1.25 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box sx={{ minWidth: 0, pr: 1 }}>
            <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }}>
              {run?.name || 'Flow run'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {runId || 'Unknown run id'}
            </Typography>
          </Box>

          <FlowRunActionsMenu
            onOpenNotes={() => onOpenNotes?.(run)}
            disabled={!runId}
          />
        </Box>

        <Box sx={{ mt: 1.2, display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
          <Chip
            size="small"
            label={`State: ${getFlowRunStateLabel(run)}`}
            color={resolveRunChipColor(run)}
            variant="outlined"
          />
          <Chip
            size="small"
            label={`Created: ${formatTimestamp(run?.created)}`}
            color="cyberAqua"
            variant="outlined"
          />
          <Chip
            size="small"
            label={`Expected: ${formatTimestamp(run?.expected_start_time)}`}
            color="cyberAqua"
            variant="outlined"
          />
          <Chip
            size="small"
            label={`Started: ${formatTimestamp(run?.start_time)}`}
            color="cyberMag"
            variant="outlined"
          />
          <Chip
            size="small"
            label={`Ended: ${formatTimestamp(run?.end_time)}`}
            color="cyberMag"
            variant="outlined"
          />
          <Chip
            size="small"
            label={`Duration: ${formatDurationSeconds(runDurationSeconds)}`}
            color="cyberAqua"
            variant="outlined"
          />
          <Chip
            size="small"
            label={`${runParameters} params`}
            color="cyberMag"
            variant="outlined"
          />
        </Box>
      </CardContent>
    </Card>
  );
}
