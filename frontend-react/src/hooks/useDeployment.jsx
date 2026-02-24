import { useQuery } from '@tanstack/react-query';
import { useAxios } from './useAxios';
import { buildAuthUrl } from '@/api/httpClient';
import { getApiErrorMessage } from '@/utils/apiError';

const useDeployment = (id, options = {}) => {
  const axiosInstance = useAxios();
  const enabled = options.enabled ?? Boolean(id);

  return useQuery({
    queryKey: ['deployment', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Deployment id is required');
      }
      // TODO: what is the purpose of buildAuthUrl? How does implementing this differ from creating a new client in src/api
      const url = buildAuthUrl(`/deployments/${id}`);
      try {
        const response = await axiosInstance.get(url);
        return response.data;
      } catch (error) {
        throw new Error(getApiErrorMessage(error, 'Failed to load deployment'));
      }
    },
    enabled,
    retry: 3,
    retryDelay: 1000,
  });
};

export { useDeployment };
