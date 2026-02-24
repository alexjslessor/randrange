import {
  keepPreviousData,
  useQuery,
} from '@tanstack/react-query';
import { useAxios } from './useAxios';
import { buildAuthUrl } from '@/api/httpClient';

const fetchScheduledDeploymentIds = async (axiosInstance, dateString) => {
  if (!dateString) return [];
  const url = buildAuthUrl(`/deployments/scheduled-ids?date=${encodeURIComponent(dateString)}`);
  const response = await axiosInstance.get(url);
  return Array.isArray(response.data) ? response.data : [];
};

const useScheduledDeploymentIds = (dateString) => {
  const axiosInstance = useAxios();

  return useQuery({
    queryKey: ['scheduled-deployment-ids', dateString],
    queryFn: () => fetchScheduledDeploymentIds(axiosInstance, dateString),
    enabled: Boolean(dateString),
    placeholderData: keepPreviousData,
    retry: 3,
    retryDelay: 1000,
  });
};

export { useScheduledDeploymentIds, fetchScheduledDeploymentIds };
