import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/adminClient';
import { useAxios } from './useAxios';
import { ADMIN_QUERY_KEYS } from './adminQueryKeys';

const useAdminOAuthClients = ({ realmId = null } = {}, options = {}) => {
  const axiosInstance = useAxios();
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.oauthClientsByRealm(realmId),
    queryFn: () => adminApi(axiosInstance).fetchAdminOAuthClients(realmId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

const useCreateAdminOAuthClient = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi(axiosInstance).createAdminOAuthClient(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.oauthClients }),
  });
};

export {
  useAdminOAuthClients,
  useCreateAdminOAuthClient,
};
