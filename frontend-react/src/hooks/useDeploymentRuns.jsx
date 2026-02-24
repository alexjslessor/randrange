import { useQuery } from '@tanstack/react-query';
import { useAxios } from './useAxios';
import { buildAuthUrl } from '@/api/httpClient';

const fetchDeploymentRuns = async (
  axiosInstance,
  {
    deploymentId,
    limit = 100,
    state = '',
  },
) => {
  if (!deploymentId) {
    return [];
  }

  const normalizedState = String(state || '').trim().toUpperCase();
  const response = await axiosInstance.get(
    buildAuthUrl(`/deployments/${deploymentId}/runs`),
    {
      params: {
        limit,
        ...(normalizedState
          ? { state: normalizedState }
          : {}),
      },
    },
  );
  return Array.isArray(response?.data) ? response.data : [];
};

const useDeploymentRuns = (
  deploymentId,
  {
    limit = 100,
    state = '',
    enabled = true,
  } = {},
) => {
  const axiosInstance = useAxios();
  const normalizedState = String(state || '').trim().toUpperCase();

  return useQuery({
    queryKey: ['deployment-runs', deploymentId, limit, normalizedState],
    queryFn: () => fetchDeploymentRuns(
      axiosInstance,
      {
        deploymentId,
        limit,
        state: normalizedState,
      },
    ),
    enabled: Boolean(deploymentId) && enabled,
    staleTime: 30_000,
    retry: 3,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });
};

export {
  fetchDeploymentRuns,
  useDeploymentRuns,
};
