import {
  keepPreviousData,
  useQuery,
} from '@tanstack/react-query';
import { useAxios } from './useAxios';
import { buildAuthUrl } from '@/api/httpClient';
import { normalizeIds } from '@/utils/arrayUtils';

const fetchFlowRunLateness = async (
  axiosInstance,
  {
    deploymentIds,
    lookbackDays = 30,
  },
) => {
  const normalizedIds = normalizeIds(deploymentIds);
  if (!normalizedIds.length) return null;

  const lookbackStart = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const url = buildAuthUrl('/flow_runs/lateness');

  const payload = {
    flow_runs: {
      deployment_id: {
        any_: normalizedIds,
      },
      expected_start_time: {
        after_: lookbackStart,
      },
    },
  };

  const response = await axiosInstance.post(url, payload);
  const value = response?.data;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
};

const useFlowRunLateness = ({
  deploymentIds = [],
  lookbackDays = 30,
  enabled = true,
} = {}) => {
  const axiosInstance = useAxios();
  const normalizedIds = normalizeIds(deploymentIds);

  return useQuery({
    queryKey: ['flow-run-lateness', normalizedIds, lookbackDays],
    queryFn: () =>
      fetchFlowRunLateness(axiosInstance, {
        deploymentIds: normalizedIds,
        lookbackDays,
      }),
    enabled: enabled && normalizedIds.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: 3,
    retryDelay: 1000,
  });
};

export {
  useFlowRunLateness,
  fetchFlowRunLateness,
};
