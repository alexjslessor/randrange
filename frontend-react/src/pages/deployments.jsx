import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Box,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import DeploymentFiltersCard from '@/components/DeploymentFiltersCard';
import DeploymentFteDialog from '@/components/DeploymentFteDialog';
import DeploymentRunDialog from '@/components/DeploymentRunDialog';
import DeploymentSummaryCard from '@/components/DeploymentSummaryCard';
import ErrorMsg from '@/components/ErrorMsg';
import LoadingMsg from '@/components/LoadingMsg';
import PaginationControl from '@/components/PaginationControl';
import SearchInput from '@/components/SearchInput';
import { useAuthContext } from '@/context';
import { useDeployments } from '@/hooks/useDeployments';
import { useRunDeploymentWithSnackbar } from '@/hooks/useRunDeploymentWithSnackbar';
import { useFlowRunsFilter } from '@/hooks/useFlowRunsFilter';
import { useRunnableDeploymentIds } from '@/hooks/useRunnableDeploymentIds';
import { useScheduledDeploymentIds } from '@/hooks/useScheduledDeploymentIds';
import { getApiErrorColor, getApiErrorMessage } from '@/utils/apiError';
import { buildDeploymentsSearchParams, parsePositiveInt } from '@/utils/searchParams';

const DEFAULT_PAGE_LIMIT = 10;
const DEFAULT_SORT = 'NAME_ASC';
const DEPLOYMENT_NAME_SORT_OPTIONS = [
  {
    label: 'Name (A-Z)',
    value: 'NAME_ASC',
  },
  {
    label: 'Name (Z-A)',
    value: 'NAME_DESC',
  },
];
const DEPLOYMENT_NAME_SORT_VALUES = new Set(
  DEPLOYMENT_NAME_SORT_OPTIONS.map((option) => option.value),
);
const NON_SCHEDULED_FLOW_RUN_TYPES = [
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CRASHED',
  'CANCELLED',
  'CANCELLING',
];
const normalizeDeploymentNameSort = (value) => (
  DEPLOYMENT_NAME_SORT_VALUES.has(value) ? value : DEFAULT_SORT
);

export default function DeploymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT);
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);
  const [search, setSearch] = useState('');
  const [runTargetId, setRunTargetId] = useState(null);
  const [runDialogDeployment, setRunDialogDeployment] = useState(null);
  const [fteDialogDeployment, setFteDialogDeployment] = useState(null);
  const [tags, setTags] = useState([]);
  const [scheduleDate, setScheduleDate] = useState('');
  const { isSuperuser, roles } = useAuthContext();
  const canManageFte = isSuperuser || roles.includes('group_admin');

  const {
    data: scheduledDeploymentIds = [],
    isFetching: isScheduleFetching,
  } = useScheduledDeploymentIds(scheduleDate);

  const deploymentFilters = {
    ...(search
      ? {
        flow_or_deployment_name: {
          like_: search,
        },
      }
      : {}),
    ...(tags.length
      ? {
        tags: {
          any_: tags,
        },
      }
      : {}),
    ...(scheduleDate
      ? {
        id: {
          any_: scheduledDeploymentIds,
        },
      }
      : {}),
  };

  const filters = {
    page,
    limit,
    sort: sortBy,
    ...(Object.keys(deploymentFilters).length
      ? {
        deployments: deploymentFilters,
      }
      : {}),
  };

  const {
    data: deploymentsResponse,
    isLoading,
    isError,
    error,
  } = useDeployments(
    filters,
    {
      enabled: !scheduleDate || !isScheduleFetching,
    },
  );
  const deployments = deploymentsResponse?.results || [];
  const deploymentIds = useMemo(
    () =>
      deployments
        .map((deployment) => String(deployment?.id || '').trim())
        .filter(Boolean),
    [deployments]
  );
  const {
    data: runnableDeploymentIds = [],
    isLoading: isRunnableDeploymentIdsLoading,
  } = useRunnableDeploymentIds(deploymentIds, {
    enabled: deploymentIds.length > 0,
  });
  const runnableDeploymentIdSet = useMemo(
    () => new Set(runnableDeploymentIds.map((id) => String(id))),
    [runnableDeploymentIds]
  );
  const {
    data: latestFlowRuns = [],
    isLoading: isLatestFlowRunsLoading,
    isFetching: isLatestFlowRunsFetching,
    isError: isLatestFlowRunsError,
  } = useFlowRunsFilter({
    deploymentIds,
    lookbackDays: 3650,
    limit: 200,
    sort: 'ID_DESC',
    stateTypes: NON_SCHEDULED_FLOW_RUN_TYPES,
    enabled: deploymentIds.length > 0,
  });
  const latestRunTimestampByDeploymentId = useMemo(() => {
    const entries = new Map();
    latestFlowRuns.forEach((run) => {
      const deploymentId = String(run?.deployment_id || '').trim();
      if (!deploymentId || entries.has(deploymentId)) return;
      const timestamp = run?.start_time || run?.end_time || run?.expected_start_time || run?.created || null;
      entries.set(deploymentId, timestamp);
    });
    return entries;
  }, [latestFlowRuns]);

  const {
    runDeploymentWithFeedback,
    isRunPending,
  } = useRunDeploymentWithSnackbar();

  useEffect(() => {
    const qp = parsePositiveInt(searchParams.get('page'), 1);
    const qlimit = parsePositiveInt(searchParams.get('limit'), DEFAULT_PAGE_LIMIT);
    const qsort = normalizeDeploymentNameSort(searchParams.get('sort'));
    const qsearch = searchParams.get('search');
    setPage(qp);
    setLimit(qlimit);
    setSortBy(qsort);
    setSearch(qsearch !== null ? qsearch : '');
  }, [searchParams]);

  const totalCount = deploymentsResponse?.count || deployments.length;
  const totalPages = deploymentsResponse?.pages || Math.max(Math.ceil(totalCount / limit), 1);

  useEffect(() => {
    if (isError) {
      setPage(1);
    }
  }, [isError]);

  const onPageChange = (_event, value) => {
    setPage(value);
    const newParams = buildDeploymentsSearchParams(searchParams, {
      page: value,
      limit,
      sort: sortBy,
      search,
    });
    setSearchParams(newParams, { replace: false });
  };

  const handleSearch = (term) => {
    const nextSearch = term.trim();
    setSearch(nextSearch);
    setPage(1);
    const newParams = buildDeploymentsSearchParams(searchParams, {
      page: 1,
      limit,
      sort: sortBy,
      search: nextSearch,
    });
    setSearchParams(newParams, { replace: false });
  };

  const handleSortChange = (event) => {
    const nextSort = normalizeDeploymentNameSort(event.target.value);
    setSortBy(nextSort);
    setPage(1);
    const newParams = buildDeploymentsSearchParams(searchParams, {
      page: 1,
      limit,
      sort: nextSort,
      search,
    });
    setSearchParams(newParams, { replace: false });
  };

  const handleTagsChange = (nextTags) => {
    const cleanedTags = nextTags
      .map((tag) => tag.trim())
      .filter(Boolean);
    setTags(cleanedTags);
    setPage(1);
  };

  const handleScheduleDateChange = (nextDate) => {
    setScheduleDate(nextDate);
    setPage(1);
  };

  const handleClearFilters = () => {
    setTags([]);
    setScheduleDate('');
    setPage(1);
  };

  const handleOpenRunDialog = (deployment) => {
    setRunDialogDeployment(deployment);
  };

  const handleCloseRunDialog = () => {
    if (!isRunPending) {
      setRunDialogDeployment(null);
    }
  };

  const handleRunDeployment = (formData = {}) => {
    const deploymentId = runDialogDeployment?.id;
    if (!deploymentId) return;
    setRunTargetId(deploymentId);
    runDeploymentWithFeedback({
      deploymentId,
      deploymentName: runDialogDeployment?.name || 'deployment',
      formData,
      onSettled: () => {
        setRunTargetId(null);
        setRunDialogDeployment(null);
      },
    });
  };

  const handleOpenFteDialog = (deployment) => {
    setFteDialogDeployment(deployment);
  };

  const handleCloseFteDialog = () => {
    setFteDialogDeployment(null);
  };

  if (isLoading || isScheduleFetching) {
    return <LoadingMsg msg="Loading..." color="" />;
  }

  if (isError) {
    const msg = getApiErrorMessage(error, 'Failed to load deployments');
    const color = getApiErrorColor(error, 'warning');
    return <ErrorMsg msg={msg} color={color} />;
  }

  return (
    <Container maxWidth="lg">
      <Box mt={2} display="flex" justifyContent="space-around" alignItems="center">
        <SearchInput onSearch={handleSearch} defaultValue={search} />
      </Box>

      <DeploymentFiltersCard
        tags={tags}
        onTagsChange={handleTagsChange}
        scheduleDate={scheduleDate}
        onScheduleDateChange={handleScheduleDateChange}
        onClear={handleClearFilters}
      />

      <Box
        sx={{
          mt: { xs: 3, sm: 1, md: 3, lg: 1, xl: 3 },
          mb: { xs: 1, sm: 2, md: 3, lg: 1, xl: 1 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography component="div" variant="h6">
          {totalCount} Results
        </Typography>

        <Box display="flex" alignItems="center" gap={2}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="deployments-sort-by-label">Sort by</InputLabel>
            <Select
              labelId="deployments-sort-by-label"
              id="deployments-sort-by"
              value={sortBy}
              label="Sort by"
              onChange={handleSortChange}
            >
              {DEPLOYMENT_NAME_SORT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <PaginationControl
            totalPages={totalPages}
            currentPage={page}
            onPageChange={onPageChange}
            color="secondary"
          />
        </Box>
      </Box>

      <div>
        {deployments.map((deployment) => {
          const deploymentId = String(deployment?.id || '').trim();
          const isDeploymentReady = deployment?.status === 'READY';
          const hasRunPermission = deploymentId ? runnableDeploymentIdSet.has(deploymentId) : false;
          const isRunPermissionPending = Boolean(deploymentId) && isRunnableDeploymentIdsLoading;
          const hasLastRun = latestRunTimestampByDeploymentId.has(deploymentId);
          const lastRunAt = isLatestFlowRunsError
            ? undefined
            : hasLastRun
              ? latestRunTimestampByDeploymentId.get(deploymentId)
              : (isLatestFlowRunsLoading || isLatestFlowRunsFetching ? undefined : null);
          return (
            <DeploymentSummaryCard
              key={deployment.id || deployment.name}
              deployment={deployment}
              lastRunAt={lastRunAt}
              onOpenFte={() => handleOpenFteDialog(deployment)}
              canManageFte={canManageFte}
              actionsDisabled={!deployment.id}
              onRun={() => handleOpenRunDialog(deployment)}
              runDisabled={
                !deployment.id
                || !isDeploymentReady
                || isRunPermissionPending
                || !hasRunPermission
                || (isRunPending && runTargetId === deployment.id)
              }
              runTooltip={
                !deployment.id
                  ? 'Deployment id unavailable'
                  : !isDeploymentReady
                    ? 'deployment is not ready'
                  : isRunPermissionPending
                    ? 'Checking run permission...'
                    : hasRunPermission
                      ? 'Trigger a run for this deployment'
                      : 'You do not have run permission for this deployment'
              }
              runLabel={isRunPending && runTargetId === deployment.id ? 'Starting...' : 'Run'}
              showTagsCount
              titleLinkToDeployment
              cardSx={{
                display: 'flex',
                padding: '0px',
                margin: '5px',
              }}
            />
          );
        })}

        {deployments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ m: 2 }}>
            No deployments found.
          </Typography>
        ) : null}
      </div>

      <Box mt={0} display="flex" justifyContent="space-between" alignItems="center">
        <PaginationControl
          totalPages={totalPages}
          currentPage={page}
          onPageChange={onPageChange}
        />
      </Box>

      <DeploymentRunDialog
        open={Boolean(runDialogDeployment)}
        onClose={handleCloseRunDialog}
        onSubmit={handleRunDeployment}
        isSubmitting={Boolean(isRunPending && runTargetId === runDialogDeployment?.id)}
        deploymentId={runDialogDeployment?.id ? String(runDialogDeployment.id) : ''}
        deploymentName={runDialogDeployment?.name || ''}
        parameterSchema={runDialogDeployment?.parameter_openapi_schema ?? null}
        defaultParameters={runDialogDeployment?.parameters ?? {}}
      />

      <DeploymentFteDialog
        open={Boolean(fteDialogDeployment)}
        onClose={handleCloseFteDialog}
        deployment={fteDialogDeployment}
        isAdmin={canManageFte}
      />
    </Container>
  );
}
