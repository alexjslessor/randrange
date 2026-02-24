import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/adminClient';
import { useAxios } from './useAxios';
import { ADMIN_QUERY_KEYS } from './adminQueryKeys';

const useAdminPrefectDeployments = (options = {}) => {
  const axiosInstance = useAxios();
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.prefectDeployments,
    queryFn: () => adminApi(axiosInstance).fetchAdminPrefectDeployments(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export {
  useAdminPrefectDeployments,
};
