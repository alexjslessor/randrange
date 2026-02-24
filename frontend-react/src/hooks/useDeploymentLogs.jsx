import { useEffect } from 'react';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAxios } from './useAxios';
import { buildAuthUrl } from '@/api/httpClient';
import { toArray } from '@/utils/arrayUtils';

const TERMINAL_FLOW_RUN_STATES = new Set([
  'CANCELLED',
  'CANCELLING',
  'COMPLETED',
  'CRASHED',
  'FAILED',
]);

const NON_SCHEDULED_FLOW_RUN_TYPES = [
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CRASHED',
  'CANCELLED',
  'CANCELLING',
];

const getFlowRunStateValue = (flowRun) => ({
  stateType: String(flowRun?.state_type || flowRun?.state?.type || '').toUpperCase(),
  stateName: String(flowRun?.state_name || flowRun?.state?.name || '').toUpperCase(),
});

const isFlowRunActive = (flowRun) => {
  if (!flowRun) return false;
  const { stateType, stateName } = getFlowRunStateValue(flowRun);
  if (!stateType && !stateName) return false;
  if (TERMINAL_FLOW_RUN_STATES.has(stateType) || TERMINAL_FLOW_RUN_STATES.has(stateName)) {
    return false;
  }
  return true;
};

const toTimestampMs = (value) => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

const resolveLatestTimestamp = (rows, fallback = null) => {
  let latestTimestamp = fallback;
  let latestTimestampMs = toTimestampMs(fallback);

  toArray(rows).forEach((row) => {
    const timestamp = row?.timestamp || row?.created || null;
    const timestampMs = toTimestampMs(timestamp);
    if (timestampMs > latestTimestampMs) {
      latestTimestamp = timestamp;
      latestTimestampMs = timestampMs;
    }
  });

  return latestTimestamp;
};

const mergeLogRows = (existingRows, nextRows) => {
  const deduped = new Map();
  const allRows = [...toArray(existingRows), ...toArray(nextRows)];

  allRows.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    const key = String(
      row.id
      || [
        row.timestamp || '',
        row.name || '',
        row.level || '',
        row.message || '',
        row.flow_run_id || '',
        row.task_run_id || '',
      ].join(':'),
    );
    if (!deduped.has(key)) {
      deduped.set(key, row);
    }
  });

  return Array.from(deduped.values()).sort((left, right) => {
    const leftMs = toTimestampMs(left?.timestamp || left?.created || null);
    const rightMs = toTimestampMs(right?.timestamp || right?.created || null);
    return leftMs - rightMs;
  });
};

const fetchLatestFlowRun = async (axiosInstance, deploymentId) => {
  if (!deploymentId) return null;
  const url = buildAuthUrl('/flow_runs/filter');
  const payload = {
    sort: 'ID_DESC',
    limit: 1,
    flow_runs: {
      deployment_id: {
        any_: [deploymentId],
      },
      state: {
        type: {
          any_: NON_SCHEDULED_FLOW_RUN_TYPES,
        },
      },
    },
  };

  const response = await axiosInstance.post(url, payload);
  const rows = toArray(response?.data);
  return rows[0] ?? null;
};

const fetchFlowRunLogs = async (
  axiosInstance,
  {
    flowRunId,
    afterTimestamp,
    limit,
  },
) => {
  if (!flowRunId) {
    return {
      rows: [],
      nextCursor: afterTimestamp || null,
    };
  }

  const payload = {
    logs: {
      flow_run_id: {
        any_: [flowRunId],
      },
      ...(afterTimestamp
        ? {
          timestamp: {
            after_: afterTimestamp,
          },
        }
        : {}),
    },
    sort: 'TIMESTAMP_ASC',
    limit,
  };

  const response = await axiosInstance.post(buildAuthUrl('/logs/filter'), payload);
  const rows = toArray(response?.data);
  const nextCursor = resolveLatestTimestamp(rows, afterTimestamp || null);

  return {
    rows,
    nextCursor,
  };
};

const useDeploymentLogs = ({
  deploymentId,
  enabled = true,
  pollIntervalMs = 2000,
  flowRunRefreshIntervalMs = 2000,
  logLimit = 200,
} = {}) => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  const latestFlowRunQuery = useQuery({
    queryKey: ['deployment-latest-flow-run', deploymentId],
    queryFn: () => fetchLatestFlowRun(axiosInstance, deploymentId),
    enabled: enabled && Boolean(deploymentId),
    retry: 3,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => (isFlowRunActive(query.state.data) ? flowRunRefreshIntervalMs : false),
  });

  const flowRun = latestFlowRunQuery.data ?? null;
  const flowRunId = flowRun?.id ? String(flowRun.id) : '';
  const shouldPollLogs = enabled && Boolean(flowRunId) && isFlowRunActive(flowRun);

  const logsQuery = useInfiniteQuery({
    queryKey: ['deployment-log-poller', flowRunId, logLimit],
    queryFn: ({ pageParam }) => fetchFlowRunLogs(
      axiosInstance,
      {
        flowRunId,
        afterTimestamp: pageParam,
        limit: logLimit,
      },
    ),
    initialPageParam: null,
    enabled: enabled && Boolean(flowRunId),
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? null,
    maxPages: 1,
    staleTime: shouldPollLogs ? pollIntervalMs : 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchInterval: shouldPollLogs ? pollIntervalMs : false,
  });

  useEffect(() => {
    if (!flowRunId) return;
    queryClient.removeQueries({ queryKey: ['deployment-logs-flat', flowRunId] });
  }, [flowRunId, queryClient]);

  useEffect(() => {
    const latestPage = logsQuery.data?.pages?.[logsQuery.data.pages.length - 1];
    if (!latestPage) return;
    const latestRows = toArray(latestPage.rows);
    if (!latestRows.length) return;
    queryClient.setQueryData(
      ['deployment-logs-flat', flowRunId],
      (prev) => mergeLogRows(prev ?? [], latestRows),
    );
  }, [logsQuery.dataUpdatedAt, flowRunId, queryClient]);

  const logs = queryClient.getQueryData(['deployment-logs-flat', flowRunId]) ?? [];

  return {
    logs,
    flowRun,
    flowRunId,
    isFlowRunActive: isFlowRunActive(flowRun),
    isFlowRunLoading: latestFlowRunQuery.isLoading,
    isFlowRunError: latestFlowRunQuery.isError,
    flowRunError: latestFlowRunQuery.error,
    isLogsLoading: logsQuery.isLoading && logs.length === 0,
    isLogsFetching: logsQuery.isFetching || logsQuery.isFetchingNextPage,
    isLogsError: logsQuery.isError,
    logsError: logsQuery.error,
    isPolling: Boolean(shouldPollLogs),
    refetchFlowRun: latestFlowRunQuery.refetch,
    refetchLogs: logsQuery.fetchNextPage,
  };
};

export {
  useDeploymentLogs,
  isFlowRunActive,
};
