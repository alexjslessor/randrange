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

const fetchFlowRunsFilter = async (
  axiosInstance,
  {
    deploymentIds,
    lookbackDays = 30,
    limit = 200,
    sort = 'EXPECTED_START_TIME_DESC',
    stateTypes = [],
  },
) => {
  const normalizedIds = normalizeIds(deploymentIds);
  const normalizedStateTypes = Array.from(
    new Set(
      (Array.isArray(stateTypes) ? stateTypes : [])
        .map((state) => String(state || '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
  if (!normalizedIds.length) return [];

  const normalizedLookbackDays = Number(lookbackDays);
  const shouldFilterByLookback = Number.isFinite(normalizedLookbackDays) && normalizedLookbackDays > 0;
  const lookbackStart = shouldFilterByLookback
    ? new Date(Date.now() - normalizedLookbackDays * 24 * 60 * 60 * 1000).toISOString()
    : null;
  const url = buildAuthUrl('/flow_runs/filter');

  const payload = {
    sort,
    limit,
    flow_runs: {
      deployment_id: {
        any_: normalizedIds,
      },
      ...(lookbackStart
        ? {
          expected_start_time: {
            after_: lookbackStart,
          },
        }
        : {}),
      ...(normalizedStateTypes.length
        ? {
          state: {
            type: {
              any_: normalizedStateTypes,
            },
          },
        }
        : {}),
    },
  };

  const response = await axiosInstance.post(url, payload);
  const rows = toArray(response?.data);
  return rows.filter((run) => normalizedIds.includes(String(run?.deployment_id || '')));
};

const useFlowRunsFilter = ({
  deploymentIds = [],
  lookbackDays = 30,
  limit = 200,
  sort = 'EXPECTED_START_TIME_DESC',
  stateTypes = [],
  enabled = true,
} = {}) => {
  const axiosInstance = useAxios();
  const normalizedIds = normalizeIds(deploymentIds);
  const normalizedStateTypes = Array.from(
    new Set(
      (Array.isArray(stateTypes) ? stateTypes : [])
        .map((state) => String(state || '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  return useQuery({
    queryKey: ['flow-runs-filter', normalizedIds, lookbackDays, limit, sort, normalizedStateTypes],
    queryFn: () =>
      fetchFlowRunsFilter(axiosInstance, {
        deploymentIds: normalizedIds,
        lookbackDays,
        limit,
        sort,
        stateTypes: normalizedStateTypes,
      }),
    enabled: enabled && normalizedIds.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: 3,
    retryDelay: 1000,
  });
};

export {
  useFlowRunsFilter,
  fetchFlowRunsFilter,
};
