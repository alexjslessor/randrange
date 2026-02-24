import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/adminClient';
import { ADMIN_QUERY_KEYS } from './adminQueryKeys';
import { useAxios } from './useAxios';

const patchGroup = async (axiosInstance, payload) => {
  const { groupId, ...partialUpdate } = payload || {};

  if (!groupId) {
    throw new Error('Group id is required');
  }

  const response = await adminApi(axiosInstance).updateGroupPartial(
    groupId, 
    partialUpdate,
  );
  return response;
};

const useGroupPatch = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => patchGroup(axiosInstance, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.groups }),
        queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users }),
        queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.permissionMatrix }),
      ]);
    },

  });
};

export { 
  patchGroup, 
  useGroupPatch 
};
