import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/adminClient';
import { useAxios } from './useAxios';
import { ADMIN_QUERY_KEYS } from './adminQueryKeys';

const normalizePermissionMapRows = (rows) => {
  const deploymentPermissionMap = {};
  (Array.isArray(rows) ? rows : []).forEach((item) => {
    const deploymentId = item?.resource_external_id;
    const permissionCode = item?.permission_code;
    if (!deploymentId || !permissionCode) return;
    if (!deploymentPermissionMap[deploymentId]) {
      deploymentPermissionMap[deploymentId] = [];
    }
    if (!deploymentPermissionMap[deploymentId].includes(permissionCode)) {
      deploymentPermissionMap[deploymentId].push(permissionCode);
    }
  });
  Object.keys(deploymentPermissionMap).forEach((deploymentId) => {
    deploymentPermissionMap[deploymentId] = deploymentPermissionMap[deploymentId].sort();
  });
  return deploymentPermissionMap;
};

const useAdminUserDeploymentPermissionsMap = (
  {
    users = [],
    resourceType = 'deployment',
  } = {},
  options = {},
) => {
  const axiosInstance = useAxios();
  const normalizedUserIds = (Array.isArray(users) ? users : [])
    .map((user) => user?.id)
    .filter(Boolean)
    .sort();

  return useQuery({
    queryKey: [
      ...ADMIN_QUERY_KEYS.userResourcePermissionsByType(resourceType),
      normalizedUserIds.join('|'),
    ],
    queryFn: async () => {
      if (normalizedUserIds.length === 0) return {};
      const responses = await Promise.all(
        normalizedUserIds.map((userId) =>
          adminApi(axiosInstance).fetchAdminUserResourcePermissions({
            userId,
            resourceType,
          })
        )
      );
      return normalizedUserIds.reduce((acc, userId, index) => {
        acc[userId] = normalizePermissionMapRows(responses[index]);
        return acc;
      }, {});
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export {
  useAdminUserDeploymentPermissionsMap,
};
