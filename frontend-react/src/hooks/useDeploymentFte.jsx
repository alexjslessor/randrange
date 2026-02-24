import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAxios } from './useAxios';
import { buildAuthUrl } from '@/api/httpClient';

const fetchDeploymentFte = async (axiosInstance, deploymentId) => {
  if (!deploymentId) {
    return null;
  }

  const url = buildAuthUrl(`/metadata/deployments/${deploymentId}/fte`);
  const response = await axiosInstance.get(url);
  return response.data ?? null;
};

const upsertDeploymentFte = async (axiosInstance, { deploymentId, body }) => {
  if (!deploymentId) {
    throw new Error('Deployment id is required');
  }
  const url = buildAuthUrl(`/metadata/deployments/${deploymentId}/fte`);
  const response = await axiosInstance.put(url, body);
  return response.data;
};

const useDeploymentFte = (deploymentId, options = {}) => {
  const axiosInstance = useAxios();
  const enabled = options.enabled ?? Boolean(deploymentId);

  return useQuery({
    queryKey: ['deployment-fte', deploymentId],
    queryFn: () => fetchDeploymentFte(axiosInstance, deploymentId),
    enabled,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });
};

const useSaveDeploymentFte = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => upsertDeploymentFte(axiosInstance, payload),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['deployment-fte', variables?.deploymentId], data);
    },
  });
};

export {
  fetchDeploymentFte,
  upsertDeploymentFte,
  useDeploymentFte,
  useSaveDeploymentFte,
};
