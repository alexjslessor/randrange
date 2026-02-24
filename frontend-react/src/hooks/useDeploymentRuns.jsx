import { useQuery } from '@tanstack/react-query';
import { useAxios } from './useAxios';
import { buildAuthUrl } from '@/api/httpClient';

const fetchDeploymentRuns = async (
  axiosInstance,
  {
    deploymentId,
    limit = 100,
  },
) => {
  if (!deploymentId) {
    return [];
  }

  const response = await axiosInstance.get(
    buildAuthUrl(`/deployments/${deploymentId}/runs`),
    {
      params: { limit },
    },
  );
  return Array.isArray(response?.data) ? response.data : [];
};

const useDeploymentRuns = (
  deploymentId,
  {
    limit = 100,
    enabled = true,
  } = {},
) => {
  const axiosInstance = useAxios();

  return useQuery({
    queryKey: ['deployment-runs', deploymentId, limit],
    queryFn: () => fetchDeploymentRuns(
      axiosInstance,
      {
        deploymentId,
        limit,
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
