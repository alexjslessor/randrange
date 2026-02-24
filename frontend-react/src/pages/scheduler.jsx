import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import ErrorMsg from '@/components/ErrorMsg';
import LoadingMsg from '@/components/LoadingMsg';
import SchedulingHeatmap from '@/components/SchedulingHeatmap';
import { useSchedulingModel } from '@/hooks/useSchedulingModel';
import { MODEL_QUEUE_ALL } from '@/lib/schedulingRiskModel';

const tabPanelStyle = {
  mt: 2,
};

const runtimePercentileLabels = {
  90: 'p90',
  95: 'p95',
};

const queueLabelFromOptions = (options, queueId) =>
  options.find((option) => option.id === queueId)?.label || queueId || 'Unknown queue';

const formatGridNumber = (input, digits = 2) => {
  const rawValue = input && typeof input === 'object' && 'value' in input ? input.value : input;
  const value = Number(rawValue);
  return Number.isFinite(value) ? value.toFixed(digits) : '-';
};

export default function SchedulerPage() {
  const [activeTab, setActiveTab] = useState('heatmap');
  const [selectedDeploymentId, setSelectedDeploymentId] = useState('');
  const [selectedQueueId, setSelectedQueueId] = useState(MODEL_QUEUE_ALL);
  const [horizonDays, setHorizonDays] = useState(7);
  const [lookbackDays] = useState(30);
  const [runtimePercentile, setRuntimePercentile] = useState(95);
  const [bufferMinutes, setBufferMinutes] = useState(2);
  const [bucketMinutes, setBucketMinutes] = useState(15);
  const [stepMinutes, setStepMinutes] = useState(15);
  const [riskWeights, setRiskWeights] = useState({
    concurrency: 1.0,
    lateness: 0.04,
    retry: 0.6,
  });

  const model = useSchedulingModel({
    horizonDays,
    lookbackDays,
    runtimePercentile,
    bufferSeconds: bufferMinutes * 60,
    bucketMinutes,
    stepMinutes,
    topN: 15,
    riskWeights,
    selectedDeploymentId,
    selectedQueueId,
  });

  useEffect(() => {
    if (!selectedDeploymentId && model.deployments?.length) {
      const firstDeploymentId = String(model.deployments[0]?.id || '').trim();
      if (firstDeploymentId) {
        setSelectedDeploymentId(firstDeploymentId);
      }
    }
  }, [model.deployments, selectedDeploymentId]);

  const selectedDeployment = selectedDeploymentId ? model.deploymentMap[selectedDeploymentId] : null;
  const selectedStats = selectedDeploymentId ? model.statsByDeployment[selectedDeploymentId] : null;

  const recommendationRows = useMemo(
    () =>
      (model.recommendations || []).map((row) => ({
        id: `${row.day}-${row.time}-${row.rank}`,
        ...row,
      })),
    [model.recommendations],
  );

  const collisionRows = useMemo(
    () =>
      (model.collisionDrivers || []).map((row) => ({
        id: row.deploymentId,
        ...row,
      })),
    [model.collisionDrivers],
  );

  const queueSummaryRows = useMemo(
    () =>
      (model.queueSummaries || []).map((row) => ({
        id: row.queueId,
        ...row,
      })),
    [model.queueSummaries],
  );

  const recommendationColumns = [
    { field: 'rank', headerName: 'Rank', width: 80 },
    { field: 'day', headerName: 'Day', width: 90 },
    { field: 'time', headerName: 'Time', width: 100 },
    {
      field: 'riskScore',
      headerName: 'Risk Score',
      width: 120,
      valueFormatter: (value) => formatGridNumber(value, 2),
    },
    {
      field: 'peakConcurrency',
      headerName: 'Peak Overlap',
      width: 130,
      valueFormatter: (value) => formatGridNumber(value, 1),
    },
    {
      field: 'avgRisk',
      headerName: 'Avg Risk',
      width: 120,
      valueFormatter: (value) => formatGridNumber(value, 2),
    },
    {
      field: 'latenessPenaltyMinutes',
      headerName: 'p90 Late (min)',
      width: 130,
      valueFormatter: (value) => formatGridNumber(value, 1),
    },
    {
      field: 'retryPenaltyAttempts',
      headerName: 'Retry Amp',
      width: 110,
      valueFormatter: (value) => formatGridNumber(value, 2),
    },
    { field: 'reason', headerName: 'Why', flex: 1, minWidth: 240 },
  ];

  const collisionColumns = [
    { field: 'deploymentName', headerName: 'Deployment', flex: 1, minWidth: 220 },
    {
      field: 'overlapMinutes',
      headerName: 'Overlap Min',
      width: 120,
      valueFormatter: (value) => formatGridNumber(value, 1),
    },
    {
      field: 'collisions',
      headerName: 'Collisions',
      width: 100,
    },
    {
      field: 'averageOverlapMinutes',
      headerName: 'Avg Overlap',
      width: 120,
      valueFormatter: (value) => formatGridNumber(value, 1),
    },
    {
      field: 'maxRiskWeight',
      headerName: 'Peak Risk Wt',
      width: 120,
      valueFormatter: (value) => formatGridNumber(value, 2),
    },
    { field: 'reason', headerName: 'Why', flex: 1, minWidth: 220 },
  ];

  const queueSummaryColumns = [
    { field: 'queueLabel', headerName: 'Queue', flex: 1, minWidth: 180 },
    {
      field: 'maxRisk',
      headerName: 'Max Risk',
      width: 120,
      valueFormatter: (value) => formatGridNumber(value, 2),
    },
    {
      field: 'avgRisk',
      headerName: 'Avg Risk',
      width: 120,
      valueFormatter: (value) => formatGridNumber(value, 2),
    },
  ];

  if (model.isLoading) {
    return <LoadingMsg msg="Loading scheduling model..." color="" />;
  }

  if (model.isError) {
    const message = model.error?.response?.data?.detail || model.error?.message || 'Failed to load scheduling data';
    return <ErrorMsg msg={message} color="warning" />;
  }

  return (
    <Container maxWidth="xl">
      <Box mt={2}>
        <Typography variant="h4">Scheduling Tool</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Tail-latency scheduling for a single constrained VM: recommendations are optimized using p90/p95 runtimes, per-queue contention, lateness, and retry amplification.
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mt: 2 }}>
        This model avoids mean runtime bias. Risk is driven by tail duration ({runtimePercentileLabels[runtimePercentile]}), queue contention, historical lateness by hour, and retry amplification.
      </Alert>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6} lg={4}>
              <Autocomplete
                options={model.deployments}
                getOptionLabel={(option) => option?.name || option?.id || ''}
                value={selectedDeployment || null}
                onChange={(_, value) => setSelectedDeploymentId(String(value?.id || ''))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Target Deployment"
                    helperText="Used to size recommendation windows via tail duration."
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6} lg={3}>
              <FormControl fullWidth>
                <InputLabel id="queue-select-label">Queue</InputLabel>
                <Select
                  labelId="queue-select-label"
                  value={model.activeQueueId || MODEL_QUEUE_ALL}
                  label="Queue"
                  onChange={(event) => setSelectedQueueId(String(event.target.value))}
                >
                  {(model.queueOptions || []).map((queue) => (
                    <MenuItem key={queue.id} value={queue.id}>
                      {queue.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4} lg={2}>
              <FormControl fullWidth>
                <InputLabel id="horizon-select-label">Horizon</InputLabel>
                <Select
                  labelId="horizon-select-label"
                  label="Horizon"
                  value={horizonDays}
                  onChange={(event) => setHorizonDays(Number(event.target.value))}
                >
                  <MenuItem value={3}>3 days</MenuItem>
                  <MenuItem value={7}>7 days</MenuItem>
                  <MenuItem value={14}>14 days</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4} lg={2}>
              <FormControl fullWidth>
                <InputLabel id="percentile-select-label">Runtime</InputLabel>
                <Select
                  labelId="percentile-select-label"
                  label="Runtime"
                  value={runtimePercentile}
                  onChange={(event) => setRuntimePercentile(Number(event.target.value))}
                >
                  <MenuItem value={90}>p90</MenuItem>
                  <MenuItem value={95}>p95</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4} lg={1}>
              <FormControl fullWidth>
                <InputLabel id="bucket-select-label">Bucket</InputLabel>
                <Select
                  labelId="bucket-select-label"
                  label="Bucket"
                  value={bucketMinutes}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setBucketMinutes(value);
                    setStepMinutes(Math.max(value, stepMinutes));
                  }}
                >
                  <MenuItem value={5}>5 minutes</MenuItem>
                  <MenuItem value={10}>10 minutes</MenuItem>
                  <MenuItem value={15}>15 minutes</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">
                Buffer after run end ({bufferMinutes} minutes)
              </Typography>
              <Slider
                value={bufferMinutes}
                onChange={(_, value) => setBufferMinutes(Number(value))}
                min={0}
                max={20}
                step={1}
                marks={[
                  { value: 0, label: '0m' },
                  { value: 10, label: '10m' },
                  { value: 20, label: '20m' },
                ]}
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">
                Recommendation step ({stepMinutes} minutes)
              </Typography>
              <Slider
                value={stepMinutes}
                onChange={(_, value) => setStepMinutes(Math.max(bucketMinutes, Number(value)))}
                min={bucketMinutes}
                max={60}
                step={bucketMinutes}
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="caption" color="text.secondary">
                Concurrency weight ({riskWeights.concurrency.toFixed(2)})
              </Typography>
              <Slider
                value={riskWeights.concurrency}
                onChange={(_, value) => setRiskWeights((previous) => ({ ...previous, concurrency: Number(value) }))}
                min={0}
                max={2}
                step={0.05}
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="caption" color="text.secondary">
                Lateness weight ({riskWeights.lateness.toFixed(2)})
              </Typography>
              <Slider
                value={riskWeights.lateness}
                onChange={(_, value) => setRiskWeights((previous) => ({ ...previous, lateness: Number(value) }))}
                min={0}
                max={0.2}
                step={0.01}
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="caption" color="text.secondary">
                Retry weight ({riskWeights.retry.toFixed(2)})
              </Typography>
              <Slider
                value={riskWeights.retry}
                onChange={(_, value) => setRiskWeights((previous) => ({ ...previous, retry: Number(value) }))}
                min={0}
                max={1.5}
                step={0.05}
                valueLabelDisplay="auto"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${model.deployments.length} deployments`} variant="outlined" color="cyberAqua" />
            <Chip
              label={`Queue: ${queueLabelFromOptions(model.queueOptions || [], model.activeQueueId)}`}
              variant="outlined"
              color="cyberAqua"
            />
            <Chip
              label={`Runtime model: ${model.runtimePercentileKey} + ${bufferMinutes}m buffer`}
              variant="outlined"
              color="cyberMag"
            />
            <Chip
              label={`Fallback duration: ${Math.round(model.fallbackDurationSeconds / 60)}m`}
              variant="outlined"
              color="cyberMag"
            />
            <Chip
              label={`Global avg lateness: ${
                Number.isFinite(Number(model.averageLatenessSeconds))
                  ? `${(Number(model.averageLatenessSeconds) / 60).toFixed(1)}m`
                  : 'n/a'
              }`}
              variant="outlined"
              color="cyberAqua"
            />
          </Stack>
        </CardContent>
      </Card>

      {selectedStats ? (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6">{selectedStats.deploymentName}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Queue {selectedStats.queueLabel}. Recommendations are sized using tail durations, not mean runtime.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
              <Chip label={`p50 ${(selectedStats.duration.p50 / 60).toFixed(1)}m`} variant="outlined" color="cyberAqua" />
              <Chip label={`p90 ${(selectedStats.duration.p90 / 60).toFixed(1)}m`} variant="outlined" color="cyberMag" />
              <Chip label={`p95 ${(selectedStats.duration.p95 / 60).toFixed(1)}m`} variant="outlined" color="cyberMag" />
              <Chip label={`Avg attempts ${selectedStats.retry.avgAttempts.toFixed(2)}`} variant="outlined" color="cyberAqua" />
              <Chip label={`${selectedStats.historyCount} historical runs`} variant="outlined" color="cyberAqua" />
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab value="heatmap" label="Risk Heatmap" />
            <Tab value="recommendations" label="Recommendations" />
            <Tab value="collisions" label="Collision Drivers" />
            <Tab value="queues" label="Queue Summary" />
          </Tabs>

          {activeTab === 'heatmap' ? (
            <Box sx={tabPanelStyle}>
              <SchedulingHeatmap
                chartData={model.heatmap}
                bucketMinutes={bucketMinutes}
                title={`Scheduling Risk - ${queueLabelFromOptions(model.queueOptions || [], model.activeQueueId)}`}
                subtitle={`Risk = overlap + lateness + retry weighting (${runtimePercentileLabels[runtimePercentile]} durations)`}
              />
            </Box>
          ) : null}

          {activeTab === 'recommendations' ? (
            <Box sx={tabPanelStyle}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Lowest-risk windows for a run sized at {Math.round(model.recommendationRunSeconds / 60)} minutes.
              </Typography>
              <Box sx={{ height: 460 }}>
                <DataGrid
                  rows={recommendationRows}
                  columns={recommendationColumns}
                  density="compact"
                  disableRowSelectionOnClick
                  hideFooter
                  loading={model.isFetching}
                />
              </Box>
            </Box>
          ) : null}

          {activeTab === 'collisions' ? (
            <Box sx={tabPanelStyle}>
              {selectedDeploymentId ? (
                <Box sx={{ height: 460 }}>
                  <DataGrid
                    rows={collisionRows}
                    columns={collisionColumns}
                    density="compact"
                    disableRowSelectionOnClick
                    hideFooter
                    loading={model.isFetching}
                  />
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Select a deployment to inspect collision drivers.
                </Typography>
              )}
            </Box>
          ) : null}

          {activeTab === 'queues' ? (
            <Box sx={tabPanelStyle}>
              <Box sx={{ height: 360 }}>
                <DataGrid
                  rows={queueSummaryRows}
                  columns={queueSummaryColumns}
                  density="compact"
                  disableRowSelectionOnClick
                  hideFooter
                  loading={model.isFetching}
                />
              </Box>
            </Box>
          ) : null}
        </CardContent>
      </Card>
    </Container>
  );
}
