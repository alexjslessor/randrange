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

const invalidateGroupResourcePermissions = (queryClient, resourceType = null) => (
  resourceType
    ? queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.groupResourcePermissionsByType(resourceType) })
    : queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.groupResourcePermissions })
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

const useAdminGroups = (options = {}) => {
  const axiosInstance = useAxios();
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.groups,
    queryFn: () => adminApi(axiosInstance).fetchAdminGroups(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

const useCreateAdminGroup = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi(axiosInstance).createAdminGroup(payload),
    onSuccess: () => Promise.all([
      invalidateUsersGroupsAndMatrix(queryClient),
      invalidateGroupResourcePermissions(queryClient),
    ]),
  });
};

const useDeleteAdminGroup = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId }) => adminApi(axiosInstance).deleteAdminGroup(groupId),
    onSuccess: () => Promise.all([
      invalidateUsersGroupsAndMatrix(queryClient),
      invalidateGroupResourcePermissions(queryClient),
    ]),
  });
};

const useAssignAdminGroupResourcePermissions = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi(axiosInstance).assignAdminGroupResourcePermissions(payload),
    onSuccess: async (_data, variables) => {
      const groupId = variables?.groupId;
      const resourceType = variables?.resourceType;
      const resourceExternalIds = Array.isArray(variables?.resourceExternalIds)
        ? variables.resourceExternalIds.filter(Boolean)
        : [];
      const permissionCodes = Array.isArray(variables?.permissionCodes)
        ? variables.permissionCodes.filter(Boolean)
        : [];

      if (groupId && resourceType && resourceExternalIds.length > 0 && permissionCodes.length > 0) {
        queryClient.setQueriesData(
          { queryKey: ADMIN_QUERY_KEYS.groupResourcePermissionsByType(resourceType) },
          (current) => {
            if (!current || typeof current !== 'object') return current;
            return {
              ...current,
              [groupId]: mergeResourcePermissionMap({
                currentMap: current[groupId],
                resourceExternalIds,
                permissionCodes,
              }),
            };
          },
        );
      }

      await Promise.all([
        invalidateUsersGroupsAndMatrix(queryClient),
        invalidateGroupResourcePermissions(queryClient, resourceType),
      ]);
    },
  });
};

const useRemoveAdminGroupResourcePermission = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi(axiosInstance).removeAdminGroupResourcePermission(payload),
    onSuccess: async (_data, variables) => {
      const groupId = variables?.groupId;
      const resourceType = variables?.resourceType;
      const resourceExternalId = variables?.resourceExternalId;
      const permissionCode = variables?.permissionCode;

      if (groupId && resourceType && resourceExternalId && permissionCode) {
        queryClient.setQueriesData(
          { queryKey: ADMIN_QUERY_KEYS.groupResourcePermissionsByType(resourceType) },
          (current) => {
            if (!current || typeof current !== 'object') return current;
            const groupMap = current[groupId];
            if (!groupMap || typeof groupMap !== 'object') return current;
            const nextCodes = (Array.isArray(groupMap[resourceExternalId]) ? groupMap[resourceExternalId] : [])
              .filter((code) => code !== permissionCode);
            const nextGroupMap = { ...groupMap };
            if (nextCodes.length > 0) {
              nextGroupMap[resourceExternalId] = nextCodes;
            } else {
              delete nextGroupMap[resourceExternalId];
            }
            return {
              ...current,
              [groupId]: nextGroupMap,
            };
          },
        );
      }

      await Promise.all([
        invalidateUsersGroupsAndMatrix(queryClient),
        invalidateGroupResourcePermissions(queryClient, resourceType),
      ]);
    },
  });
};

export {
  useAdminGroups,
  useCreateAdminGroup,
  useDeleteAdminGroup,
  useAssignAdminGroupResourcePermissions,
  useRemoveAdminGroupResourcePermission,
};
