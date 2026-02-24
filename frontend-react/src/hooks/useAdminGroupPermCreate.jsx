import { useMutation, useQueryClient } from '@tanstack/react-query';
import { buildAuthUrl } from '@/api/httpClient';
import { useAxios } from './useAxios';
import { ADMIN_QUERY_KEYS } from './adminQueryKeys';

const assignAdminGroupPermissions = async (axiosInstance, payload) => {
  const {
    groupId,
    clientId,
    permissionCodes,
  } = payload || {};

  if (!groupId) {
    throw new Error('Group id is required');
  }
  if (!clientId) {
    throw new Error('Client id is required');
  }
  if (!Array.isArray(permissionCodes) || permissionCodes.length === 0) {
    throw new Error('At least one permission code is required');
  }

  await axiosInstance.post(
    buildAuthUrl(`/admin/groups/${groupId}/permissions`),
    {
      client_id: clientId,
      permission_codes: permissionCodes,
    },
  );
  return { assigned: true };
};

const useAssignAdminGroupPermissions = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => assignAdminGroupPermissions(axiosInstance, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.groups }),
        queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users }),
        queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.permissions }),
        queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.permissionMatrix }),
      ]);
    },
  });
};

export {
  assignAdminGroupPermissions,
  useAssignAdminGroupPermissions,
};
