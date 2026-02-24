import {
  keepPreviousData,
  useQuery,
} from '@tanstack/react-query';
import { useAxios } from './useAxios';
import { buildAuthUrl } from '@/api/httpClient';
import { getApiErrorMessage } from '@/utils/apiError';

const fetchDeployments = async (axiosInstance, filters = {}) => {
  const url = buildAuthUrl('/deployments/paginate');
  try {
    const response = await axiosInstance.post(url, filters);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load deployments'));
  }
};

const useDeployments = (filters = {}, options = {}) => {
  const axiosInstance = useAxios();

  return useQuery({
    queryKey: ['deployments', filters],
    queryFn: () => fetchDeployments(axiosInstance, filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: 3,
    retryDelay: 1000,
    enabled: options.enabled ?? true,
  });
};

export { useDeployments, fetchDeployments }
