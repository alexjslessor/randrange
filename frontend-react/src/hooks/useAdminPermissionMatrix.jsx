import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/adminClient';
import { useAxios } from './useAxios';
import { ADMIN_QUERY_KEYS } from './adminQueryKeys';

const useAdminPermissionMatrix = (
  {
    pageIndex = 0,
    pageSize = 25,
    sortBy = 'group_name',
    sortDir = 'asc',
  } = {},
  options = {},
) => {
  const axiosInstance = useAxios();
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.permissionMatrixPage({
      pageIndex,
      pageSize,
      sortBy,
      sortDir,
    }),
    queryFn: () => adminApi(axiosInstance).fetchAdminPermissionMatrix({
      page: pageIndex + 1,
      pageSize,
      sortBy,
      sortDir,
    }),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    ...options,
  });
};

export {
  useAdminPermissionMatrix,
};
