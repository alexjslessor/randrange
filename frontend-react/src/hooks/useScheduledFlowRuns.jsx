import {
  keepPreviousData,
  useQuery,
} from '@tanstack/react-query';
import { useAxios } from './useAxios';
import { buildAuthUrl } from '@/api/httpClient';
import {
  normalizeIds,
  toArray,
} from '@/utils/arrayUtils';

const fetchScheduledFlowRuns = async (
  axiosInstance,
  {
    deploymentIds,
    horizonDays = 7,
    limit = 200,
  },
) => {
  const normalizedIds = normalizeIds(deploymentIds);
  if (!normalizedIds.length) return [];

  const now = new Date();
  const scheduledBefore = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000).toISOString();
  const url = buildAuthUrl('/deployments/get_scheduled_flow_runs');

  const payload = {
    deployment_ids: normalizedIds,
    scheduled_before: scheduledBefore,
    limit,
  };

  const response = await axiosInstance.post(url, payload);
  const rows = toArray(response?.data);
  const nowMs = now.getTime() - 60 * 1000;

  return rows.filter((run) => {
    const value = run?.expected_start_time || run?.start_time || run?.next_scheduled_start_time || run?.created;
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return date.getTime() >= nowMs;
  });
};

const useScheduledFlowRuns = ({
  deploymentIds = [],
  horizonDays = 7,
  limit = 200,
  enabled = true,
} = {}) => {
  const axiosInstance = useAxios();
  const normalizedIds = normalizeIds(deploymentIds);

  return useQuery({
    queryKey: ['scheduled-flow-runs', normalizedIds, horizonDays, limit],
    queryFn: () =>
      fetchScheduledFlowRuns(axiosInstance, {
        deploymentIds: normalizedIds,
        horizonDays,
        limit,
      }),
    enabled: enabled && normalizedIds.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: 3,
    retryDelay: 1000,
  });
};

export {
  useScheduledFlowRuns,
  fetchScheduledFlowRuns,
};
