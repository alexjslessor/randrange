import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAxios } from './useAxios';
import { buildAuthUrl } from '@/api/httpClient';
import { getApiErrorMessage } from '@/utils/apiError';

const createDeploymentRun = async (axiosInstance, { id, body = {} }) => {
  if (!id) {
    throw new Error('Deployment id is required');
  }
  const url = buildAuthUrl(`/deployments/${id}/create_flow_run`);
  try {
    const response = await axiosInstance.post(url, body);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to create deployment run'));
  }
};

const useDeploymentRun = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createDeploymentRun(axiosInstance, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['deployments'],
      });
    },
  });
};

export { useDeploymentRun, createDeploymentRun };
