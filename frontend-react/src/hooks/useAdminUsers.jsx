import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/adminClient';
import { useAxios } from './useAxios';
import { ADMIN_QUERY_KEYS } from './adminQueryKeys';

const invalidateUsersGroupsAndMatrix = (queryClient) => Promise.all([
  queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users }),
  queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.groups }),
  queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.permissions }),
  queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.permissionMatrix }),
]);

const invalidateUserResourcePermissions = (queryClient, resourceType = null) => (
  resourceType
    ? queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.userResourcePermissionsByType(resourceType) })
    : queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.userResourcePermissions })
);

const mergeResourcePermissionMap = ({
  currentMap,
  resourceExternalIds,
  permissionCodes,
}) => {
  const nextMap = { ...(currentMap || {}) };
  resourceExternalIds.forEach((resourceExternalId) => {
    const existingCodes = Array.isArray(nextMap[resourceExternalId])
      ? nextMap[resourceExternalId]
      : [];
    nextMap[resourceExternalId] = Array.from(
      new Set([
        ...existingCodes,
        ...permissionCodes,
      ])
    ).sort();
  });
  return nextMap;
};

const useAdminUsers = (options = {}) => {
  const axiosInstance = useAxios();
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.users,
    queryFn: () => adminApi(axiosInstance).fetchAdminUsers(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

const useCreateAdminUser = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi(axiosInstance).createAdminUser(payload),
    onSuccess: () => Promise.all([
      invalidateUsersGroupsAndMatrix(queryClient),
      invalidateUserResourcePermissions(queryClient),
    ]),
  });
};

const useDeleteAdminUser = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId }) => adminApi(axiosInstance).deleteAdminUser(userId),
    onSuccess: () => Promise.all([
      invalidateUsersGroupsAndMatrix(queryClient),
      invalidateUserResourcePermissions(queryClient),
    ]),
  });
};

const useUpdateAdminUser = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi(axiosInstance).updateAdminUser(payload),
    onSuccess: () => invalidateUsersGroupsAndMatrix(queryClient),
  });
};

const useAssignAdminUserToGroup = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi(axiosInstance).assignAdminUserToGroup(payload),
    onSuccess: () => invalidateUsersGroupsAndMatrix(queryClient),
  });
};

const useAssignAdminUserResourcePermissions = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi(axiosInstance).assignAdminUserResourcePermissions(payload),
    onSuccess: async (_data, variables) => {
      const userId = variables?.userId;
      const resourceType = variables?.resourceType;
      const resourceExternalIds = Array.isArray(variables?.resourceExternalIds)
        ? variables.resourceExternalIds.filter(Boolean)
        : [];
      const permissionCodes = Array.isArray(variables?.permissionCodes)
        ? variables.permissionCodes.filter(Boolean)
        : [];

      if (userId && resourceType && resourceExternalIds.length > 0 && permissionCodes.length > 0) {
        queryClient.setQueriesData(
          { queryKey: ADMIN_QUERY_KEYS.userResourcePermissionsByType(resourceType) },
          (current) => {
            if (!current || typeof current !== 'object') return current;
            return {
              ...current,
              [userId]: mergeResourcePermissionMap({
                currentMap: current[userId],
                resourceExternalIds,
                permissionCodes,
              }),
            };
          },
        );
      }

      await Promise.all([
        invalidateUsersGroupsAndMatrix(queryClient),
        invalidateUserResourcePermissions(queryClient, resourceType),
      ]);
    },
  });
};

const useRemoveAdminUserResourcePermission = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi(axiosInstance).removeAdminUserResourcePermission(payload),
    onSuccess: async (_data, variables) => {
      const userId = variables?.userId;
      const resourceType = variables?.resourceType;
      const resourceExternalId = variables?.resourceExternalId;
      const permissionCode = variables?.permissionCode;

      if (userId && resourceType && resourceExternalId && permissionCode) {
        queryClient.setQueriesData(
          { queryKey: ADMIN_QUERY_KEYS.userResourcePermissionsByType(resourceType) },
          (current) => {
            if (!current || typeof current !== 'object') return current;
            const userMap = current[userId];
            if (!userMap || typeof userMap !== 'object') return current;
            const nextCodes = (Array.isArray(userMap[resourceExternalId]) ? userMap[resourceExternalId] : [])
              .filter((code) => code !== permissionCode);
            const nextUserMap = { ...userMap };
            if (nextCodes.length > 0) {
              nextUserMap[resourceExternalId] = nextCodes;
            } else {
              delete nextUserMap[resourceExternalId];
            }
            return {
              ...current,
              [userId]: nextUserMap,
            };
          },
        );
      }

      await Promise.all([
        invalidateUsersGroupsAndMatrix(queryClient),
        invalidateUserResourcePermissions(queryClient, resourceType),
      ]);
    },
  });
};

export {
  useAdminUsers,
  useCreateAdminUser,
  useDeleteAdminUser,
  useUpdateAdminUser,
  useAssignAdminUserToGroup,
  useAssignAdminUserResourcePermissions,
  useRemoveAdminUserResourcePermission,
};
