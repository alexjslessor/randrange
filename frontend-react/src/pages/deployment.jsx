import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import DeploymentFteDialog from '@/components/DeploymentFteDialog';
import DeploymentLogsPanel from '@/components/DeploymentLogsPanel';
import DeploymentRunDialog from '@/components/DeploymentRunDialog';
import DeploymentSummaryCard from '@/components/DeploymentSummaryCard';
import ErrorMsg from '@/components/ErrorMsg';
import FlowRunNotesDialog from '@/components/FlowRunNotesDialog';
import FlowRunSummaryCard from '@/components/FlowRunSummaryCard';
import LoadingMsg from '@/components/LoadingMsg';
import { useAuthContext } from '@/context';
import { useDeployment } from '@/hooks/useDeployment';
import { useDeploymentLogs } from '@/hooks/useDeploymentLogs';
import { useDeploymentRuns } from '@/hooks/useDeploymentRuns';
import { useRunDeploymentWithSnackbar } from '@/hooks/useRunDeploymentWithSnackbar';
import { useRunnableDeploymentIds } from '@/hooks/useRunnableDeploymentIds';
import { formatTimestamp } from '@/utils/formatTimestamp';

const getDeploymentId = (searchParams) => {
  const id = searchParams.get('id') || searchParams.get('deployment_id');
  return id?.trim() || '';
};

export default function DeploymentPage() {
  const [activeTab, setActiveTab] = useState('details');
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const [isFteDialogOpen, setIsFteDialogOpen] = useState(false);
  const [selectedFlowRunForNotes, setSelectedFlowRunForNotes] = useState(null);
  const [searchParams] = useSearchParams();
  const deploymentId = getDeploymentId(searchParams);
  const { isSuperuser, roles } = useAuthContext();
  const canManageFte = isSuperuser || roles.includes('group_admin');

  const {
    data: deploymentResponse,
    isLoading,
    isError,
    error,
  } = useDeployment(deploymentId, { enabled: Boolean(deploymentId) });

  const {
    runDeploymentWithFeedback,
    isRunPending,
  } = useRunDeploymentWithSnackbar();
  const {
    data: runnableDeploymentIds = [],
    isLoading: isRunnableDeploymentIdsLoading,
  } = useRunnableDeploymentIds(deploymentId ? [deploymentId] : [], {
    enabled: Boolean(deploymentId),
  });
  const canRunDeployment = runnableDeploymentIds.includes(deploymentId);

  const {
    data: deploymentRuns = [],
    isLoading: isRunsLoading,
    isError: isRunsError,
    error: runsError,
  } = useDeploymentRuns(
    deploymentId,
    {
      limit: 120,
      enabled: Boolean(deploymentId),
    },
  );

  const {
    logs,
    flowRun,
    flowRunId,
    isPolling,
    isFlowRunLoading,
    isFlowRunError,
    flowRunError,
    isLogsLoading,
    isLogsFetching,
    isLogsError,
    logsError,
    refetchFlowRun,
  } = useDeploymentLogs({
    deploymentId,
    enabled: Boolean(deploymentId),
  });

  if (!deploymentId) {
    return <ErrorMsg msg="Missing deployment id. Use ?id=<uuid> in the URL." color="warning" />;
  }

  if (isLoading) {
    return <LoadingMsg msg="Loading deployment..." color="" />;
  }

  if (isError) {
    const msg = error?.response?.data?.message || error?.message || 'Failed to load deployment';
    return <ErrorMsg msg={msg} color="warning" />;
  }

  const deployment = deploymentResponse?.deployment ?? deploymentResponse ?? null;

  if (!deployment) {
    return <ErrorMsg msg="Deployment not found." color="warning" />;
  }

  const detailItems = [
    { label: 'Deployment ID', value: deployment.id || deploymentId },
    { label: 'Flow ID', value: deployment.flow_id || 'Unknown' },
    { label: 'Created', value: formatTimestamp(deployment.created) },
    { label: 'Updated', value: formatTimestamp(deployment.updated) },
    { label: 'Work pool', value: deployment.work_pool_name || 'No work pool' },
    { label: 'Work queue', value: deployment.work_queue_name || 'No work queue' },
  ];

  const tags = Array.isArray(deployment.tags) ? deployment.tags : [];

  const handleOpenRunDialog = () => {
    setIsRunDialogOpen(true);
  };

  const handleCloseRunDialog = () => {
    if (!isRunPending) {
      setIsRunDialogOpen(false);
    }
  };

  const handleRunDeployment = (formData = {}) => {
    runDeploymentWithFeedback({
      deploymentId,
      deploymentName: deployment?.name || 'deployment',
      formData,
      onSuccess: () => {
        refetchFlowRun();
      },
      onSettled: () => {
        setIsRunDialogOpen(false);
      },
    });
  };

  const handleOpenFteDialog = () => {
    setIsFteDialogOpen(true);
  };

  const handleCloseFteDialog = () => {
    setIsFteDialogOpen(false);
  };

  const handleOpenFlowRunNotes = (flowRunRecord) => {
    setSelectedFlowRunForNotes(flowRunRecord);
  };

  const handleCloseFlowRunNotes = () => {
    setSelectedFlowRunForNotes(null);
  };

  return (
    <Container maxWidth="lg">
      <Box mt={2} display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="h4" component="h1">
          Deployment
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {deploymentId}
        </Typography>
      </Box>

      <DeploymentSummaryCard
        deployment={deployment}
        onOpenFte={handleOpenFteDialog}
        canManageFte={canManageFte}
        actionsDisabled={!deploymentId}
        onRun={handleOpenRunDialog}
        runDisabled={!deploymentId || isRunnableDeploymentIdsLoading || !canRunDeployment || isRunPending}
        runTooltip={
          !deploymentId
            ? 'Deployment id unavailable'
            : isRunnableDeploymentIdsLoading
              ? 'Checking run permission...'
              : canRunDeployment
                ? 'Trigger a run for this deployment'
                : 'You do not have run permission for this deployment'
        }
        runLabel={isRunPending ? 'Starting...' : 'Run'}
        statusFirst
        titleVariant="h5"
        titleComponent="div"
        descriptionSx={{ mt: 1 }}
        cardSx={{ mt: 2 }}
        actionsSx={{ mt: -1, flexWrap: 'wrap', gap: 1 }}
      />

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab value="details" label="Details" />
            <Tab value="runs" label="Runs" />
            <Tab value="logs" label="Logs" />
          </Tabs>

          {activeTab === 'details' ? (
            <Box>
              <Box
                sx={{
                  mt: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 2,
                }}
              >
                {detailItems.map((item) => (
                  <Box
                    key={item.label}
                    sx={{
                      borderRadius: 2,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      p: 2,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="body2">
                      {String(item.value)}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Box mt={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Tags
                </Typography>
                <Box mt={1} display="flex" flexWrap="wrap" gap={1}>
                  {tags.length ? (
                    tags.map((tag) => (
                      <Chip key={tag} label={tag} variant="outlined" color="cyberMag" />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No tags
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          ) : null}

          {activeTab === 'runs' ? (
            <Box sx={{ mt: 2 }}>
              {isRunsLoading ? (
                <Typography variant="body2" color="text.secondary">
                  Loading runs...
                </Typography>
              ) : null}

              {isRunsError ? (
                <Typography variant="body2" color="error.main">
                  {runsError?.message || 'Failed to load deployment runs'}
                </Typography>
              ) : null}

              {!isRunsLoading && !isRunsError && !deploymentRuns.length ? (
                <Typography variant="body2" color="text.secondary">
                  No runs found for this deployment.
                </Typography>
              ) : null}

              <Box sx={{ display: 'grid', gap: 1.25 }}>
                {deploymentRuns.map((run) => {
                  const runId = String(run?.id || '');
                  return (
                    <FlowRunSummaryCard
                      key={runId || `${run?.name || 'run'}-${run?.created || ''}`}
                      run={run}
                      onOpenNotes={handleOpenFlowRunNotes}
                    />
                  );
                })}
              </Box>
            </Box>
          ) : null}

          {activeTab === 'logs' ? (
            <DeploymentLogsPanel
              flowRun={flowRun}
              flowRunId={flowRunId}
              logs={logs}
              isPolling={isPolling}
              isFlowRunLoading={isFlowRunLoading}
              isFlowRunError={isFlowRunError}
              flowRunError={flowRunError}
              isLogsLoading={isLogsLoading}
              isLogsFetching={isLogsFetching}
              isLogsError={isLogsError}
              logsError={logsError}
            />
          ) : null}
        </CardContent>
      </Card>

      <DeploymentRunDialog
        open={isRunDialogOpen}
        onClose={handleCloseRunDialog}
        onSubmit={handleRunDeployment}
        isSubmitting={isRunPending}
        deploymentId={deployment?.id ? String(deployment.id) : deploymentId}
        deploymentName={deployment.name || ''}
        parameterSchema={deployment?.parameter_openapi_schema ?? null}
        defaultParameters={deployment?.parameters ?? {}}
      />

      <DeploymentFteDialog
        open={isFteDialogOpen}
        onClose={handleCloseFteDialog}
        deployment={deployment}
        isAdmin={canManageFte}
      />

      <FlowRunNotesDialog
        open={Boolean(selectedFlowRunForNotes)}
        onClose={handleCloseFlowRunNotes}
        flowRun={selectedFlowRunForNotes}
        deploymentName={deployment.name || ''}
      />
    </Container>
  );
}
