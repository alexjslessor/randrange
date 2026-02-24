import {
  keepPreviousData,
  useQuery,
} from '@tanstack/react-query';
import { useAxios } from './useAxios';
import { normalizeIds } from '@/utils/arrayUtils';
import { buildAuthUrl } from '@/api/httpClient';

const fetchRunnableDeploymentIds = async (axiosInstance, deploymentIds = []) => {
  const normalizedIds = normalizeIds(deploymentIds);
  if (!normalizedIds.length) {
    return [];
  }

  const response = await axiosInstance.post(
    buildAuthUrl('/deployments/runnable-ids'),
    { deployment_ids: normalizedIds }
  );
  return Array.isArray(response.data) ? response.data.map((id) => String(id)) : [];
};

const useRunnableDeploymentIds = (deploymentIds = [], options = {}) => {
  const axiosInstance = useAxios();
  const normalizedIds = normalizeIds(deploymentIds);
  const enabled = options.enabled ?? normalizedIds.length > 0;

  return useQuery({
    queryKey: ['deployments', 'runnable-ids', normalizedIds],
    queryFn: () => fetchRunnableDeploymentIds(axiosInstance, normalizedIds),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: 3,
    retryDelay: 1000,
  });
};

export {
  fetchRunnableDeploymentIds,
  useRunnableDeploymentIds,
};
