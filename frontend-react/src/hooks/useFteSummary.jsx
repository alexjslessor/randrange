import { useQuery } from '@tanstack/react-query';
import { useAxios } from './useAxios';
import { buildAuthUrl } from '@/api/httpClient';

const fetchFteSummary = async (axiosInstance, { window = 'month' } = {}) => {
  const url = buildAuthUrl('/metadata/fte/summary');
  const response = await axiosInstance.get(url, {
    params: { window },
  });
  return Array.isArray(response.data) ? response.data : [];
};

const useFteSummary = ({ window = 'month' } = {}, options = {}) => {
  const axiosInstance = useAxios();
  const enabled = options.enabled ?? true;

  return useQuery({
    queryKey: ['fte-summary', window],
    queryFn: () => fetchFteSummary(axiosInstance, { window }),
    enabled,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });
};

export {
  fetchFteSummary,
  useFteSummary,
};
