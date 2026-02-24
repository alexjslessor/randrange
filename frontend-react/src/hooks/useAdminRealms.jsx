import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/adminClient';
import { useAxios } from './useAxios';
import { ADMIN_QUERY_KEYS } from './adminQueryKeys';

const useAdminRealms = (options = {}) => {
  const axiosInstance = useAxios();
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.realms,
    queryFn: () => adminApi(axiosInstance).fetchAdminRealms(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

const useCreateAdminRealm = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi(axiosInstance).createAdminRealm(payload),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.realms }),
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.oauthClients }),
    ]),
  });
};

export {
  useAdminRealms,
  useCreateAdminRealm,
};
