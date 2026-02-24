import { httpClientPrivate, buildAuthUrl } from './httpClient';

export type UpdateGroupPartialRequest = {
  name?: string;
  description?: string | null;
  is_active?: boolean;
};

export type UpdateAdminUserPayload = {
  userId: string;
  isActive?: boolean;
  previousGroupIds?: string[];
  previousGroupAdminMap?: Record<string, boolean>;
  nextGroupIds?: string[];
  nextGroupAdminMap?: Record<string, boolean>;
  hasStatusChanged?: boolean;
  hasMembershipChanged?: boolean;
  hasGroupAdminChanged?: boolean;
};

export type AssignUserToGroupPayload = {
  groupId: string;
  userId: string;
  isGroupAdmin?: boolean;
};

export type ResourcePermissionsPayload = {
  resourceType: string;
  resourceExternalIds: string[];
  permissionCodes: string[];
  resourceNames?: Record<string, string>;
};

export type RemoveUserResourcePermissionPayload = {
  userId: string;
  resourceExternalId: string;
  permissionCode: string;
  resourceType: string;
};

export type RemoveGroupResourcePermissionPayload = {
  groupId: string;
  resourceExternalId: string;
  permissionCode: string;
  resourceType: string;
};

export type AdminPermissionMatrixQuery = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: string;
};

const assignResourcePermissions = async (
  axiosInstance: any, 
  urlPath: string, 
  payload: ResourcePermissionsPayload
) => {

  const { 
  resourceType, 
  resourceExternalIds, 
  permissionCodes, 
  resourceNames } = payload;

  if (!resourceType) throw new Error('Resource type is required');

  if (!Array.isArray(resourceExternalIds) || resourceExternalIds.length === 0)
    throw new Error('At least one resource id is required');

  if (!Array.isArray(permissionCodes) || permissionCodes.length === 0)
    throw new Error('At least one permission code is required');

  await axiosInstance.post(buildAuthUrl(urlPath), {
    resource_type: resourceType,
    resource_external_ids: resourceExternalIds,
    permission_codes: permissionCodes,
    resource_names: resourceNames || {},
  });
  return { assigned: true };
};

export const adminApi = (axiosInstance = httpClientPrivate) => {
  return {
    fetchAdminUsers: async () => {
      const response = await axiosInstance.get(buildAuthUrl("/admin/users"));
      return Array.isArray(response.data) ? response.data : [];
    },

    fetchAdminGroups: async () => {
      const response = await axiosInstance.get(buildAuthUrl("/admin/groups"));
      return Array.isArray(response.data) ? response.data : [];
    },

    createAdminUser: async (payload: unknown) => {
      const response = await axiosInstance.post(buildAuthUrl('/admin/users'), payload);
      return response?.data ?? null;
    },

    deleteAdminUser: async (userId: string) => {
      if (!userId) throw new Error('User id is required');
      await axiosInstance.delete(buildAuthUrl(`/admin/users/${userId}`));
      return { deleted: true };
    },

    createAdminGroup: async (payload: unknown) => {
      const response = await axiosInstance.post(buildAuthUrl('/admin/groups'), payload);
      return response?.data ?? null;
    },

    deleteAdminGroup: async (groupId: string) => {
      if (!groupId) throw new Error('Group id is required');
      await axiosInstance.delete(buildAuthUrl(`/admin/groups/${groupId}`));
      return { deleted: true };
    },

    fetchAdminPermissions: async () => {
      const response = await axiosInstance.get(buildAuthUrl('/admin/permissions'));
      return Array.isArray(response.data) ? response.data : [];
    },

    fetchAdminPermissionMatrix: async ({
      page = 1,
      pageSize = 25,
      sortBy = 'group_name',
      sortDir = 'asc',
    }: AdminPermissionMatrixQuery = {}) => {
      const response = await axiosInstance.get(
        buildAuthUrl('/admin/permission-matrix'),
        {
          params: {
            page,
            page_size: pageSize,
            sort_by: sortBy,
            sort_dir: sortDir,
          },
        },
      );
      const payload = response?.data;
      return {
        rows: Array.isArray(payload?.rows) ? payload.rows : [],
        total: Number(payload?.total) || 0,
      };
    },

    fetchAdminPrefectDeployments: async () => {
      const response = await axiosInstance.get(buildAuthUrl('/admin/prefect/deployments'));
      return Array.isArray(response.data) ? response.data : [];
    },

    fetchAdminGroupResourcePermissions: async ({
      groupId,
      resourceType,
    }: { groupId: string; resourceType: string }) => {
      if (!groupId) throw new Error('Group id is required');
      if (!resourceType) throw new Error('Resource type is required');
      const response = await axiosInstance.get(
        buildAuthUrl(`/admin/groups/${groupId}/resource-permissions`),
        { params: { resource_type: resourceType } },
      );
      return Array.isArray(response.data) ? response.data : [];
    },

    fetchAdminUserResourcePermissions: async ({
      userId,
      resourceType,
    }: { userId: string; resourceType: string }) => {
      if (!userId) throw new Error('User id is required');
      if (!resourceType) throw new Error('Resource type is required');
      const response = await axiosInstance.get(
        buildAuthUrl(`/admin/users/${userId}/resource-permissions`),
        { params: { resource_type: resourceType } },
      );
      return Array.isArray(response.data) ? response.data : [];
    },

    fetchAdminRealms: async () => {
      const response = await axiosInstance.get(buildAuthUrl("/admin/realms"));
      return Array.isArray(response.data) ? response.data : [];
    },

    createAdminRealm: async (payload: unknown) => {
      const response = await axiosInstance.post(
        buildAuthUrl("/admin/realms"),
        payload,
      );
      return response?.data ?? null;
    },

    fetchAdminOAuthClients: async (realmId: string | null = null) => {
      const response = await axiosInstance.get(
        buildAuthUrl("/admin/oauth-clients"),
        {
          params: realmId ? { realm_id: realmId } : undefined,
        },
      );
      return Array.isArray(response.data) ? response.data : [];
    },

    createAdminOAuthClient: async (payload: unknown) => {
      const response = await axiosInstance.post(
        buildAuthUrl("/admin/oauth-clients"),
        payload,
      );
      return response?.data ?? null;
    },

    updateGroupPartial: async (
      groupId: string,
      payload: UpdateGroupPartialRequest,
    ) => {
      const response = await axiosInstance.patch(
        buildAuthUrl(`/admin/groups/${groupId}`),
        payload,
      );
      return response?.data ?? null;
    },

    updateAdminUser: async (payload: UpdateAdminUserPayload) => {
      const {
        userId, isActive,
        previousGroupIds = [], 
        previousGroupAdminMap = {},
        nextGroupIds = [], 
        nextGroupAdminMap = {},
        hasStatusChanged = false, 
        hasMembershipChanged = false, 
        hasGroupAdminChanged = false,
      } = payload;

      if (!userId) throw new Error('User id is required');

      const updates: Array<() => Promise<any>> = [];

      if (hasStatusChanged) {
        updates.push(() => axiosInstance.patch(
          buildAuthUrl(`/admin/users/${userId}/disable`),
          { is_active: Boolean(isActive) },
        ));
      }
      if (hasMembershipChanged || hasGroupAdminChanged) {
        const prevSet = new Set(previousGroupIds.filter(Boolean));
        const nextSet = new Set(nextGroupIds.filter(Boolean));
        Array.from(nextSet).filter((id) => !prevSet.has(id)).forEach((groupId) => {
          updates.push(() => axiosInstance.post(
            buildAuthUrl(`/admin/groups/${groupId}/users`),
            { user_id: userId, is_group_admin: Boolean(nextGroupAdminMap?.[groupId]) },
          ));
        });
        Array.from(prevSet).filter((id) => !nextSet.has(id)).forEach((groupId) => {
          updates.push(() => axiosInstance.delete(
            buildAuthUrl(`/admin/groups/${groupId}/users/${userId}`),
          ));
        });
        if (hasGroupAdminChanged) {
          Array.from(nextSet)
            .filter((id) => prevSet.has(id) && Boolean(previousGroupAdminMap?.[id]) !== Boolean(nextGroupAdminMap?.[id]))
            .forEach((groupId) => {
              updates.push(() => axiosInstance.patch(
                buildAuthUrl(`/admin/groups/${groupId}/users/${userId}`),
                { is_group_admin: Boolean(nextGroupAdminMap?.[groupId]) },
              ));
            });
        }
      }
      if (updates.length === 0) return { updated: false };
      for (const executeUpdate of updates) {
        await executeUpdate();
      }
      return { updated: true };
    },

    assignAdminUserToGroup: async (payload: AssignUserToGroupPayload) => {
      const { groupId, userId, isGroupAdmin = false } = payload;

      if (!groupId) throw new Error('Group id is required');
      if (!userId) throw new Error('User id is required');

      await axiosInstance.post(
        buildAuthUrl(`/admin/groups/${groupId}/users`), 
        { 
          user_id: userId, 
          is_group_admin: Boolean(isGroupAdmin) 
        }
      );
      return { assigned: true };
    },

    assignAdminGroupResourcePermissions: async (payload: ResourcePermissionsPayload & { groupId: string }) => {
      const { groupId } = payload;
      if (!groupId) throw new Error('Group id is required');
      return assignResourcePermissions(axiosInstance, `/admin/groups/${groupId}/resource-permissions`, payload);
    },

    assignAdminUserResourcePermissions: async (payload: ResourcePermissionsPayload & { userId: string }) => {
      const { userId } = payload;
      if (!userId) throw new Error('User id is required');
      return assignResourcePermissions(axiosInstance, `/admin/users/${userId}/resource-permissions`, payload);
    },

    removeAdminUserResourcePermission: async (payload: RemoveUserResourcePermissionPayload) => {
      const { userId, resourceExternalId, permissionCode, resourceType } = payload;
      if (!userId) throw new Error('User id is required');
      if (!resourceExternalId) throw new Error('Resource external id is required');
      if (!permissionCode) throw new Error('Permission code is required');
      if (!resourceType) throw new Error('Resource type is required');
      await axiosInstance.delete(
        buildAuthUrl(`/admin/users/${userId}/resource-permissions/${resourceExternalId}`),
        { params: { permission_code: permissionCode, resource_type: resourceType } },
      );
      return { removed: true };
    },

    removeAdminGroupResourcePermission: async (payload: RemoveGroupResourcePermissionPayload) => {
      const { groupId, resourceExternalId, permissionCode, resourceType } = payload;
      if (!groupId) throw new Error('Group id is required');
      if (!resourceExternalId) throw new Error('Resource external id is required');
      if (!permissionCode) throw new Error('Permission code is required');
      if (!resourceType) throw new Error('Resource type is required');
      await axiosInstance.delete(
        buildAuthUrl(`/admin/groups/${groupId}/resource-permissions/${resourceExternalId}`),
        { params: { permission_code: permissionCode, resource_type: resourceType } },
      );
      return { removed: true };
    },

    rotateAdminSigningKey: async () => {
      const response = await axiosInstance.post(buildAuthUrl('/admin/keys/rotate'));
      return response?.data ?? null;
    },
  };
};
