import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Container,
  FormControl,
  InputLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { DataGrid } from '@mui/x-data-grid';
import LoadingMsg from '@/components/LoadingMsg';
import {
  useAdminUsers,
  useCreateAdminUser,
  useDeleteAdminUser,
  useUpdateAdminUser,
  useAssignAdminUserToGroup,
  useAssignAdminUserResourcePermissions,
  useRemoveAdminUserResourcePermission,
} from '@/hooks/useAdminUsers';
import {
  useAdminGroups,
  useCreateAdminGroup,
  useDeleteAdminGroup,
  useAssignAdminGroupResourcePermissions,
  useRemoveAdminGroupResourcePermission,
} from '@/hooks/useAdminGroups';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useAdminPrefectDeployments } from '@/hooks/useAdminPrefectDeployments';
import { useAdminPermissionMatrix } from '@/hooks/useAdminPermissionMatrix';
import { useAdminRealms, useCreateAdminRealm } from '@/hooks/useAdminRealms';
import { useAdminOAuthClients, useCreateAdminOAuthClient } from '@/hooks/useAdminOAuthClients';
import { useRotateAdminSigningKey } from '@/hooks/useAdminKeys';
import { useAssignAdminGroupPermissions } from '@/hooks/useAdminGroupPermCreate';
import { useGroupPatch } from '@/hooks/useGroupPatch';
import { useFteSummary } from '@/hooks/useFteSummary';
import { useAuthContext, useSnackbar } from '@/context';
import DashboardConfirmDeleteDialog from '@/pages/account/components/DashboardConfirmDeleteDialog';
import DashboardCreateGroupDialog from '@/pages/account/components/DashboardCreateGroupDialog';
import DashboardCreateUserDialog from '@/pages/account/components/DashboardCreateUserDialog';
import DashboardEditGroupDialog from '@/pages/account/components/DashboardEditGroupDialog';
import DashboardEditUserDialog from '@/pages/account/components/DashboardEditUserDialog';
import DashboardGroupsTab from '@/pages/account/components/DashboardGroupsTab';
import DashboardTooltipIconButton from '@/pages/account/components/DashboardTooltipIconButton';
import DashboardUserDeploymentPermissionsCard from '@/pages/account/components/DashboardUserDeploymentPermissionsCard';
import DashboardUserDeploymentPermissionsDialog from '@/pages/account/components/DashboardUserDeploymentPermissionsDialog';
import { getApiErrorMessage } from '@/utils/apiError';
import { formatTimestamp } from '@/utils/formatTimestamp';
import GroupTable from '@/components/GroupTable';

const formatDateTime = (value) => (
  formatTimestamp(value, {
    emptyValue: '',
    returnRawOnInvalid: true,
  })
);

const EMPTY_USER_FORM = {
  username: '',
  password: '',
  realm_id: '',
  is_superuser: false,
  group_id: '',
  group_is_admin: false,
};

const EMPTY_EDIT_USER_FORM = {
  id: '',
  username: '',
  realm_id: '',
  is_superuser: false,
  is_active: true,
  group_ids: [],
  group_admin_map: {},
};

const EMPTY_GROUP_FORM = {
  realm_id: '',
  name: '',
  description: '',
};

const EMPTY_EDIT_GROUP_FORM = {
  id: '',
  realm_id: '',
  name: '',
  description: '',
};

const EMPTY_MEMBERSHIP_FORM = {
  user_id: '',
  group_id: '',
  is_group_admin: false,
};

const EMPTY_REALM_CREATE_FORM = {
  slug: '',
  name: '',
  client_id: '',
  redirect_uris: '',
};

const DEFAULT_REALM_CLIENT_SCOPES = 'openid, profile, read, write';

const EMPTY_OAUTH_CLIENT_CREATE_FORM = {
  realm_id: '',
  client_id: '',
  redirect_uris: '',
  scopes: DEFAULT_REALM_CLIENT_SCOPES,
};

const DEPLOYMENT_RESOURCE_TYPE = 'deployment';
const DEFAULT_DEPLOYMENT_PERMISSION_CODES = ['deployment:read', 'deployment:run'];
const DEPLOYMENT_PERMISSION_OPTIONS = [
  { value: 'deployment:read', label: 'deployment:read' },
  { value: 'deployment:run', label: 'deployment:run' },
  { value: 'deployment:edit', label: 'deployment:edit' },
  { value: 'deployment:delete', label: 'deployment:delete' },
];

const FTE_WINDOW_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
];

const formatInteger = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '';
  return numericValue.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const formatDecimal = (value, digits = 1) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '';
  return numericValue.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const formatUsd = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '';
  return numericValue.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
};

const parseCommaSeparatedValues = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeUsersForDisplay = (rows) =>
  (Array.isArray(rows) ? rows : []).map((user) => {
    const adminGroupIds = Array.isArray(user?.admin_group_ids)
      ? user.admin_group_ids.filter(Boolean)
      : [];
    return {
      ...user,
      admin_group_ids: adminGroupIds,
      is_group_admin: adminGroupIds.length > 0 || Boolean(user?.is_group_admin),
    };
  });

const normalizePermissionsForDisplay = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .map((permission, index) => {
      const resourceType = String(permission?.resource_type || '').trim();
      const resourceExternalId = String(permission?.resource_external_id || '').trim();
      const permissionCode = String(permission?.permission_code || permission?.code || '').trim();
      const clientId = String(
        permission?.client_id
        || (resourceType === 'client' ? resourceExternalId : '')
      ).trim();
      return {
        ...permission,
        id: permission?.id || `${permission?.type || 'permission'}:${permission?.kc_group_id || permission?.kc_user_sub || 'any'}:${resourceType}:${resourceExternalId}:${permissionCode}:${index}`,
        resource_type: resourceType,
        resource_external_id: resourceExternalId,
        permission_code: permissionCode,
        client_id: clientId,
        code: permissionCode,
      };
    })
    .filter((permission) => Boolean(permission.code));

const buildDeploymentPermissionMaps = (permissions, resourceType) => {
  const groupMap = {};
  const userMap = {};

  (Array.isArray(permissions) ? permissions : []).forEach((permission) => {
    if (permission?.resource_type !== resourceType) return;

    const resourceExternalId = String(permission?.resource_external_id || '').trim();
    const permissionCode = String(permission?.permission_code || permission?.code || '').trim();
    if (!resourceExternalId || !permissionCode) return;

    if (permission?.type === 'group') {
      const groupId = String(permission?.kc_group_id || '').trim();
      if (!groupId) return;
      if (!groupMap[groupId]) groupMap[groupId] = {};
      if (!Array.isArray(groupMap[groupId][resourceExternalId])) {
        groupMap[groupId][resourceExternalId] = [];
      }
      if (!groupMap[groupId][resourceExternalId].includes(permissionCode)) {
        groupMap[groupId][resourceExternalId].push(permissionCode);
      }
      return;
    }

    if (permission?.type === 'user') {
      const userId = String(permission?.kc_user_sub || '').trim();
      if (!userId) return;
      if (!userMap[userId]) userMap[userId] = {};
      if (!Array.isArray(userMap[userId][resourceExternalId])) {
        userMap[userId][resourceExternalId] = [];
      }
      if (!userMap[userId][resourceExternalId].includes(permissionCode)) {
        userMap[userId][resourceExternalId].push(permissionCode);
      }
    }
  });

  Object.keys(groupMap).forEach((groupId) => {
    Object.keys(groupMap[groupId]).forEach((resourceExternalId) => {
      groupMap[groupId][resourceExternalId] = [...groupMap[groupId][resourceExternalId]].sort();
    });
  });
  Object.keys(userMap).forEach((userId) => {
    Object.keys(userMap[userId]).forEach((resourceExternalId) => {
      userMap[userId][resourceExternalId] = [...userMap[userId][resourceExternalId]].sort();
    });
  });

  return {
    groupDeploymentPermissionsMap: groupMap,
    userDeploymentPermissionsMap: userMap,
  };
};

export default function DashboardPage() {
  const { showSnackbar } = useSnackbar();
  const { isSuperuser, roles } = useAuthContext();
  const isGroupAdmin = roles.includes('group_admin');
  const canManageDeploymentResourcePermissions = isSuperuser || isGroupAdmin;

  const [tab, setTab] = useState('matrix');
  const [fteWindow, setFteWindow] = useState('month');
  const [permissionMatrixPageIndex, setPermissionMatrixPageIndex] = useState(0);
  const [permissionMatrixPageSize, setPermissionMatrixPageSize] = useState(25);
  const [permissionMatrixSortBy, setPermissionMatrixSortBy] = useState('group_name');
  const [permissionMatrixSortDir, setPermissionMatrixSortDir] = useState('asc');
  const [actionError, setActionError] = useState('');

  const [newUserForm, setNewUserForm] = useState(EMPTY_USER_FORM);
  const [newGroupForm, setNewGroupForm] = useState(EMPTY_GROUP_FORM);
  const [membershipForm, setMembershipForm] = useState(EMPTY_MEMBERSHIP_FORM);
  const [permissionForm, setPermissionForm] = useState({ group_id: '', client_id: '', permission_codes: [] });
  const [groupDeploymentForm, setGroupDeploymentForm] = useState({
    group_id: '',
    deployment_ids: [],
    permission_codes: DEFAULT_DEPLOYMENT_PERMISSION_CODES,
  });
  const [userDeploymentForm, setUserDeploymentForm] = useState({
    user_id: '',
    deployment_ids: [],
    permission_codes: DEFAULT_DEPLOYMENT_PERMISSION_CODES,
  });
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isUserDeploymentPermissionsDialogOpen, setIsUserDeploymentPermissionsDialogOpen] = useState(false);
  const [selectedUserDeploymentPermissionsUserId, setSelectedUserDeploymentPermissionsUserId] = useState('');
  const [editUserForm, setEditUserForm] = useState(EMPTY_EDIT_USER_FORM);
  const [editUserOriginal, setEditUserOriginal] = useState(null);
  const [editUserMembershipSeed, setEditUserMembershipSeed] = useState(null);
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false);
  const [editGroupForm, setEditGroupForm] = useState(EMPTY_EDIT_GROUP_FORM);
  const [userPendingDelete, setUserPendingDelete] = useState(null);
  const [groupPendingDelete, setGroupPendingDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRealmForm, setNewRealmForm] = useState(EMPTY_REALM_CREATE_FORM);
  const [newOAuthClientForm, setNewOAuthClientForm] = useState(EMPTY_OAUTH_CLIENT_CREATE_FORM);
  const [oauthClientRealmFilter, setOauthClientRealmFilter] = useState('all');

  const {
    data: cachedUsers = [],
    isLoading: isUsersLoading,
    error: usersLoadError,
  } = useAdminUsers({
    enabled: isSuperuser || isGroupAdmin,
  });
  const users = useMemo(
    () => normalizeUsersForDisplay(cachedUsers),
    [cachedUsers],
  );
  const selectedUserDeploymentPermissionsUser = useMemo(
    () => users.find((user) => user.id === selectedUserDeploymentPermissionsUserId) || null,
    [selectedUserDeploymentPermissionsUserId, users],
  );

  const {
    data: cachedGroups = [],
    isLoading: isGroupsLoading,
    error: groupsLoadError,
  } = useAdminGroups({
    enabled: isSuperuser || isGroupAdmin,
  });
  const groups = useMemo(
    () => (Array.isArray(cachedGroups) ? cachedGroups : []),
    [cachedGroups],
  );

  const {
    data: cachedPermissions = [],
    isLoading: isPermissionsLoading,
    error: permissionsLoadError,
  } = useAdminPermissions({
    enabled: isSuperuser || isGroupAdmin,
  });
  const permissions = useMemo(
    () => normalizePermissionsForDisplay(cachedPermissions),
    [cachedPermissions],
  );

  const {
    data: prefectDeployments = [],
    isLoading: isPrefectDeploymentsLoading,
    error: prefectDeploymentsLoadError,
  } = useAdminPrefectDeployments({
    enabled: canManageDeploymentResourcePermissions,
  });

  const {
    data: cachedRealms = [],
    isLoading: isRealmsLoading,
    error: realmsLoadError,
  } = useAdminRealms({
    enabled: isSuperuser || isGroupAdmin,
  });
  const realms = useMemo(
    () => (Array.isArray(cachedRealms) ? cachedRealms : []),
    [cachedRealms],
  );

  const {
    groupDeploymentPermissionsMap,
    userDeploymentPermissionsMap,
  } = useMemo(
    () => buildDeploymentPermissionMaps(permissions, DEPLOYMENT_RESOURCE_TYPE),
    [permissions],
  );

  const activeOAuthClientRealmFilter = oauthClientRealmFilter === 'all' ? null : oauthClientRealmFilter;
  const {
    data: oauthClients = [],
    isLoading: isOAuthClientsLoading,
    error: oauthClientsLoadError,
  } = useAdminOAuthClients(
    { realmId: activeOAuthClientRealmFilter },
    {
      enabled: isSuperuser && tab === 'realms',
    },
  );
  const {
    data: permissionMatrixPayload,
    isLoading: isPermissionMatrixLoading,
    error: permissionMatrixLoadError,
  } = useAdminPermissionMatrix(
    {
      pageIndex: permissionMatrixPageIndex,
      pageSize: permissionMatrixPageSize,
      sortBy: permissionMatrixSortBy,
      sortDir: permissionMatrixSortDir,
    },
    {
      enabled: canManageDeploymentResourcePermissions && tab === 'matrix',
    },
  );
  const permissionMatrixRows = useMemo(
    () => (Array.isArray(permissionMatrixPayload?.rows) ? permissionMatrixPayload.rows : []),
    [permissionMatrixPayload],
  );
  const permissionMatrixTotalRows = useMemo(
    () => Number(permissionMatrixPayload?.total) || 0,
    [permissionMatrixPayload],
  );

  const { mutateAsync: createAdminUserMutation } = useCreateAdminUser();
  const { mutateAsync: deleteAdminUserMutation } = useDeleteAdminUser();
  const { mutateAsync: assignAdminUserToGroupMutation } = useAssignAdminUserToGroup();
  const { mutateAsync: createAdminGroupMutation } = useCreateAdminGroup();
  const { mutateAsync: deleteAdminGroupMutation } = useDeleteAdminGroup();
  const { mutateAsync: assignAdminGroupPermissionsMutation } = useAssignAdminGroupPermissions();
  const { mutateAsync: assignAdminGroupResourcePermissionsMutation } = useAssignAdminGroupResourcePermissions();
  const { mutateAsync: removeAdminGroupResourcePermissionMutation } = useRemoveAdminGroupResourcePermission();
  const { mutateAsync: assignAdminUserResourcePermissionsMutation } = useAssignAdminUserResourcePermissions();
  const { mutateAsync: removeAdminUserResourcePermissionMutation } = useRemoveAdminUserResourcePermission();
  const { mutateAsync: updateAdminUserMutation } = useUpdateAdminUser();
  const { mutateAsync: updateAdminGroupMutation } = useGroupPatch();
  const { mutateAsync: createAdminRealmMutation } = useCreateAdminRealm();
  const { mutateAsync: createAdminOAuthClientMutation } = useCreateAdminOAuthClient();
  const { mutateAsync: rotateAdminSigningKeyMutation } = useRotateAdminSigningKey();
  const {
    data: fteSummaryRows = [],
    isLoading: isFteSummaryLoading,
    isError: isFteSummaryError,
    error: fteSummaryError,
  } = useFteSummary(
    { window: fteWindow },
    { enabled: (isSuperuser || isGroupAdmin) && tab === 'fte' },
  );

  const selectedCreateUserGroup = useMemo(
    () => groups.find((group) => group.id === newUserForm.group_id),
    [groups, newUserForm.group_id]
  );
  const selectedGroupDeploymentAssignments = useMemo(
    () => groupDeploymentPermissionsMap[groupDeploymentForm.group_id] || {},
    [groupDeploymentPermissionsMap, groupDeploymentForm.group_id]
  );
  const selectedGroupDeploymentIds = useMemo(
    () => Object.keys(selectedGroupDeploymentAssignments).sort(),
    [selectedGroupDeploymentAssignments]
  );
  const selectedUserDeploymentAssignments = useMemo(
    () => userDeploymentPermissionsMap[userDeploymentForm.user_id] || {},
    [userDeploymentPermissionsMap, userDeploymentForm.user_id]
  );
  const selectedUserDeploymentIds = useMemo(
    () => Object.keys(selectedUserDeploymentAssignments).sort(),
    [selectedUserDeploymentAssignments]
  );
  const deploymentLabelById = useMemo(
    () =>
      prefectDeployments.reduce((acc, deployment) => {
        acc[deployment.id] = deployment.name || deployment.id;
        return acc;
      }, {}),
    [prefectDeployments]
  );
  const userById = useMemo(
    () =>
      users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {}),
    [users]
  );
  const groupById = useMemo(
    () =>
      groups.reduce((acc, group) => {
        acc[group.id] = group;
        return acc;
      }, {}),
    [groups]
  );
  const permissionClientIds = useMemo(
    () =>
      Array.from(
        new Set(
          permissions
            .map((permission) => permission?.client_id)
            .filter(Boolean)
        )
      ).sort(),
    [permissions]
  );
  const filteredPermissions = useMemo(
    () =>
      permissions.filter((permission) =>
        permissionForm.client_id
          ? permission?.client_id === permissionForm.client_id
          : true
      ),
    [permissions, permissionForm.client_id]
  );
  const groupLabelById = useMemo(
    () =>
      groups.reduce((acc, group) => {
        acc[group.id] = group.name || group.id;
        return acc;
      }, {}),
    [groups]
  );
  const permissionMatrixRowsWithDeploymentLabels = useMemo(
    () =>
      permissionMatrixRows.map((row) => ({
        ...row,
        deployment_name: row?.deployment_id
          ? (deploymentLabelById[row.deployment_id] || row.deployment_name || row.deployment_id)
          : (row?.deployment_name || '(No Deployment)'),
      })),
    [deploymentLabelById, permissionMatrixRows]
  );
  const editUserSelectedGroupIds = useMemo(
    () =>
      Array.from(
        new Set(
          Array.isArray(editUserForm.group_ids)
            ? editUserForm.group_ids.filter(Boolean)
            : []
        )
      ).sort(),
    [editUserForm.group_ids]
  );

  const resolveEditUserMembership = useCallback((seed, availableGroups) => {
    const userGroupIds = Array.isArray(seed?.group_ids)
      ? seed.group_ids.filter(Boolean)
      : [];
    const userGroupNames = Array.isArray(seed?.groups)
      ? seed.groups.filter(Boolean)
      : [];
    const userAdminGroupIds = Array.isArray(seed?.admin_group_ids)
      ? seed.admin_group_ids.filter(Boolean)
      : [];
    const userGroupNameSet = new Set(userGroupNames);
    const userAdminGroupIdSet = new Set(userAdminGroupIds);
    const groupsByRealm = Array.isArray(availableGroups)
      ? availableGroups.filter(
        (group) => group.realm_id === seed?.realm_id && userGroupNameSet.has(group.name)
      )
      : [];
    const groupsAnyRealm = Array.isArray(availableGroups)
      ? availableGroups.filter((group) => userGroupNameSet.has(group.name))
      : [];
    const matchedGroups = groupsByRealm.length > 0 ? groupsByRealm : groupsAnyRealm;
    const matchedGroupIds = Array.from(new Set(matchedGroups.map((group) => group.id))).sort();
    const selectedGroupIds = Array.from(new Set([
      ...userGroupIds,
      ...matchedGroupIds,
      ...userAdminGroupIds,
    ])).sort();
    const groupAdminMap = {};
    selectedGroupIds.forEach((groupId) => {
      groupAdminMap[groupId] = userAdminGroupIdSet.has(groupId);
    });

    return {
      selectedGroupIds,
      groupAdminMap,
    };
  }, []);

  useEffect(() => {
    if (permissionClientIds.length === 0) return;
    setPermissionForm((prev) => ({
      ...prev,
      client_id: prev.client_id || permissionClientIds[0],
    }));
  }, [permissionClientIds]);

  useEffect(() => {
    if (!isSuperuser && (tab === 'keys' || tab === 'realms')) {
      setTab('users');
    }
  }, [isSuperuser, tab]);

  useEffect(() => {
    if (!canManageDeploymentResourcePermissions && tab === 'matrix') {
      setTab('users');
    }
  }, [canManageDeploymentResourcePermissions, tab]);

  useEffect(() => {
    if (!selectedUserDeploymentPermissionsUserId) return;
    if (users.some((user) => user.id === selectedUserDeploymentPermissionsUserId)) return;
    setIsUserDeploymentPermissionsDialogOpen(false);
    setSelectedUserDeploymentPermissionsUserId('');
  }, [selectedUserDeploymentPermissionsUserId, users]);

  useEffect(() => {
    if (realms.length === 0) return;
    const firstRealmId = realms[0].id;

    setNewUserForm((prev) => ({
      ...prev,
      realm_id: prev.realm_id || firstRealmId,
    }));

    setNewGroupForm((prev) => ({
      ...prev,
      realm_id: prev.realm_id || firstRealmId,
    }));

    setNewOAuthClientForm((prev) => ({
      ...prev,
      realm_id: prev.realm_id || firstRealmId,
    }));

    setOauthClientRealmFilter((prev) => {
      if (prev === 'all') return prev;
      return realms.some((realm) => realm.id === prev) ? prev : 'all';
    });
  }, [realms]);

  useEffect(() => {
    if (groups.length === 0) return;

    const firstGroupId = groups[0].id;
    const firstGroupRealmId = groups[0].realm_id;

    setMembershipForm((prev) => ({
      ...prev,
      group_id: prev.group_id || firstGroupId,
    }));

    setPermissionForm((prev) => ({
      ...prev,
      group_id: prev.group_id || firstGroupId,
    }));

    if (!isSuperuser) {
      setNewUserForm((prev) => ({
        ...prev,
        group_id: prev.group_id || firstGroupId,
        realm_id: prev.realm_id || firstGroupRealmId,
      }));
    }

    if (canManageDeploymentResourcePermissions) {
      setGroupDeploymentForm((prev) => ({
        ...prev,
        group_id: prev.group_id || firstGroupId,
        permission_codes: Array.isArray(prev.permission_codes) && prev.permission_codes.length
          ? prev.permission_codes
          : DEFAULT_DEPLOYMENT_PERMISSION_CODES,
      }));
    }
  }, [canManageDeploymentResourcePermissions, groups, isSuperuser]);

  useEffect(() => {
    if (!canManageDeploymentResourcePermissions || users.length === 0) return;
    const firstUserId = users[0].id;
    setUserDeploymentForm((prev) => ({
      ...prev,
      user_id: prev.user_id || firstUserId,
      permission_codes: Array.isArray(prev.permission_codes) && prev.permission_codes.length
        ? prev.permission_codes
        : DEFAULT_DEPLOYMENT_PERMISSION_CODES,
    }));
  }, [canManageDeploymentResourcePermissions, users]);

  useEffect(() => {
    if (isSuperuser) return;
    if (!selectedCreateUserGroup) return;
    if (newUserForm.realm_id === selectedCreateUserGroup.realm_id) return;

    setNewUserForm((prev) => ({
      ...prev,
      realm_id: selectedCreateUserGroup.realm_id,
    }));
  }, [isSuperuser, newUserForm.realm_id, selectedCreateUserGroup]);

  useEffect(() => {
    if (!canManageDeploymentResourcePermissions || !groupDeploymentForm.group_id) return;
    const assignedMap = groupDeploymentPermissionsMap[groupDeploymentForm.group_id] || {};
    const assignedDeploymentIds = Object.keys(assignedMap).sort();
    const assignedPermissionCodes = Array.from(
      new Set(
        Object.values(assignedMap).flatMap((value) => (Array.isArray(value) ? value : []))
      )
    ).sort();
    setGroupDeploymentForm((prev) => {
      const currentDeploymentIds = Array.isArray(prev.deployment_ids) ? prev.deployment_ids : [];
      const currentPermissionCodes = Array.isArray(prev.permission_codes) ? prev.permission_codes : [];
      const nextPermissionCodes = assignedPermissionCodes.length
        ? assignedPermissionCodes
        : (currentPermissionCodes.length ? currentPermissionCodes : DEFAULT_DEPLOYMENT_PERMISSION_CODES);
      if (
        assignedDeploymentIds.join('|') === currentDeploymentIds.join('|')
        && nextPermissionCodes.join('|') === currentPermissionCodes.join('|')
      ) {
        return prev;
      }
      return {
        ...prev,
        deployment_ids: assignedDeploymentIds,
        permission_codes: nextPermissionCodes,
      };
    });
  }, [canManageDeploymentResourcePermissions, groupDeploymentPermissionsMap, groupDeploymentForm.group_id]);

  useEffect(() => {
    if (!canManageDeploymentResourcePermissions || !userDeploymentForm.user_id) return;
    const assignedMap = userDeploymentPermissionsMap[userDeploymentForm.user_id] || {};
    const assignedDeploymentIds = Object.keys(assignedMap).sort();
    const assignedPermissionCodes = Array.from(
      new Set(
        Object.values(assignedMap).flatMap((value) => (Array.isArray(value) ? value : []))
      )
    ).sort();
    setUserDeploymentForm((prev) => {
      const currentDeploymentIds = Array.isArray(prev.deployment_ids) ? prev.deployment_ids : [];
      const currentPermissionCodes = Array.isArray(prev.permission_codes) ? prev.permission_codes : [];
      const nextPermissionCodes = assignedPermissionCodes.length
        ? assignedPermissionCodes
        : (currentPermissionCodes.length ? currentPermissionCodes : DEFAULT_DEPLOYMENT_PERMISSION_CODES);
      if (
        assignedDeploymentIds.join('|') === currentDeploymentIds.join('|')
        && nextPermissionCodes.join('|') === currentPermissionCodes.join('|')
      ) {
        return prev;
      }
      return {
        ...prev,
        deployment_ids: assignedDeploymentIds,
        permission_codes: nextPermissionCodes,
      };
    });
  }, [canManageDeploymentResourcePermissions, userDeploymentForm.user_id, userDeploymentPermissionsMap]);

  const setError = (error, fallback) => {
    setActionError(getApiErrorMessage(error, fallback));
  };

  const setInfo = (message) => {
    setActionError('');
    showSnackbar(message, {
      severity: 'success',
      title: 'Success',
    });
  };

  useEffect(() => {
    const maxPageIndex = Math.max(
      Math.ceil(permissionMatrixTotalRows / Math.max(permissionMatrixPageSize, 1)) - 1,
      0,
    );

    if (permissionMatrixTotalRows === 0 && permissionMatrixPageIndex !== 0) {
      setPermissionMatrixPageIndex(0);
      return;
    }

    if (permissionMatrixTotalRows > 0 && permissionMatrixPageIndex > maxPageIndex) {
      setPermissionMatrixPageIndex(maxPageIndex);
    }
  }, [permissionMatrixPageIndex, permissionMatrixPageSize, permissionMatrixTotalRows]);

  const handleCreateUser = async (event) => {
    event.preventDefault();
    if (!newUserForm.username || !newUserForm.password || !newUserForm.realm_id) {
      setActionError('Username, password, and realm are required.');
      return;
    }
    if (!isSuperuser && !newUserForm.group_id) {
      setActionError('Group admins must select a group.');
      return;
    }

    const payload = {
      username: newUserForm.username,
      password: newUserForm.password,
      realm_id: selectedCreateUserGroup?.realm_id || newUserForm.realm_id,
      is_superuser: isSuperuser ? newUserForm.is_superuser : false,
      group_id: newUserForm.group_id || null,
      group_is_admin: Boolean(newUserForm.group_is_admin),
    };

    setIsSubmitting(true);
    try {
      await createAdminUserMutation(payload);
      setNewUserForm((prev) => ({
        ...EMPTY_USER_FORM,
        realm_id: isSuperuser ? prev.realm_id : selectedCreateUserGroup?.realm_id || prev.realm_id,
        group_id: isSuperuser ? '' : prev.group_id,
      }));
      setInfo('User created.');
      setIsCreateUserDialogOpen(false);
    } catch (error) {
      setError(error, 'Unable to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreateUserDialog = () => {
    setIsCreateUserDialogOpen(true);
  };

  const handleCloseCreateUserDialog = () => {
    if (isSubmitting) return;
    setIsCreateUserDialogOpen(false);
  };

  const handleCreateUserDialogRequestClose = (_event, reason) => {
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      return;
    }
    handleCloseCreateUserDialog();
  };

  const handleOpenEditUserDialog = (user) => {
    const membershipSeed = {
      group_ids: Array.isArray(user?.group_ids) ? user.group_ids.filter(Boolean) : [],
      groups: Array.isArray(user?.groups) ? user.groups.filter(Boolean) : [],
      admin_group_ids: Array.isArray(user?.admin_group_ids) ? user.admin_group_ids.filter(Boolean) : [],
      realm_id: user?.realm_id || '',
    };
    const { selectedGroupIds, groupAdminMap } = resolveEditUserMembership(membershipSeed, groups);

    const initialForm = {
      id: user?.id || '',
      username: user?.username || '',
      realm_id: user?.realm_id || '',
      is_superuser: Boolean(user?.is_superuser),
      is_active: Boolean(user?.is_active),
      group_ids: selectedGroupIds,
      group_admin_map: groupAdminMap,
    };

    setEditUserMembershipSeed(membershipSeed);
    setEditUserForm(initialForm);
    setEditUserOriginal(initialForm);
    setIsEditUserDialogOpen(true);
  };

  const handleOpenUserDeploymentPermissionsDialog = (user) => {
    if (!canManageDeploymentResourcePermissions || !user?.id) return;
    setSelectedUserDeploymentPermissionsUserId(user.id);
    setIsUserDeploymentPermissionsDialogOpen(true);
  };

  const handleCloseEditUserDialog = () => {
    if (isSubmitting) return;
    setIsEditUserDialogOpen(false);
    setEditUserForm(EMPTY_EDIT_USER_FORM);
    setEditUserOriginal(null);
    setEditUserMembershipSeed(null);
  };

  const handleCloseUserDeploymentPermissionsDialog = () => {
    if (isSubmitting) return;
    setIsUserDeploymentPermissionsDialogOpen(false);
  };

  const handleEditUserDialogRequestClose = (_event, reason) => {
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      return;
    }
    handleCloseEditUserDialog();
  };

  useEffect(() => {
    if (!isEditUserDialogOpen || !editUserMembershipSeed) return;
    if (Array.isArray(editUserForm.group_ids) && editUserForm.group_ids.length > 0) return;

    const { selectedGroupIds, groupAdminMap } = resolveEditUserMembership(editUserMembershipSeed, groups);
    if (selectedGroupIds.length === 0) return;

    setEditUserOriginal((prev) => (
      prev && prev.group_ids.length === 0
        ? { ...prev, group_ids: selectedGroupIds, group_admin_map: groupAdminMap }
        : prev
    ));
    setEditUserForm((prev) => ({
      ...prev,
      group_ids: selectedGroupIds,
      group_admin_map: groupAdminMap,
    }));
  }, [
    editUserForm.group_ids,
    editUserMembershipSeed,
    groups,
    isEditUserDialogOpen,
    resolveEditUserMembership,
  ]);

  const handleUpdateUser = async (event) => {
    event.preventDefault();
    if (!editUserForm.id) {
      setActionError('User ID is missing.');
      return;
    }

    const hasStatusChanged = editUserOriginal
      ? editUserForm.is_active !== editUserOriginal.is_active
      : false;
    const previousGroupIds = Array.from(
      new Set(
        Array.isArray(editUserOriginal?.group_ids)
          ? editUserOriginal.group_ids.filter(Boolean)
          : []
      )
    ).sort();
    const nextGroupIds = Array.from(
      new Set(
        Array.isArray(editUserForm.group_ids)
          ? editUserForm.group_ids.filter(Boolean)
          : []
      )
    ).sort();
    const previousGroupAdminMap = previousGroupIds.reduce((acc, groupId) => {
      acc[groupId] = Boolean(editUserOriginal?.group_admin_map?.[groupId]);
      return acc;
    }, {});
    const nextGroupAdminMap = nextGroupIds.reduce((acc, groupId) => {
      acc[groupId] = Boolean(editUserForm.group_admin_map?.[groupId]);
      return acc;
    }, {});
    const nextAdminGroupIds = nextGroupIds.filter((groupId) => Boolean(nextGroupAdminMap[groupId]));
    const addedGroupIds = nextGroupIds.filter((groupId) => !previousGroupIds.includes(groupId));
    const removedGroupIds = previousGroupIds.filter((groupId) => !nextGroupIds.includes(groupId));
    const hasMembershipChanged = addedGroupIds.length > 0 || removedGroupIds.length > 0;
    const hasGroupAdminChanged = nextGroupIds.some(
      (groupId) => previousGroupAdminMap[groupId] !== nextGroupAdminMap[groupId]
    );

    if (!hasStatusChanged && !hasMembershipChanged && !hasGroupAdminChanged) {
      setInfo('No changes to save.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAdminUserMutation({
        userId: editUserForm.id,
        isActive: editUserForm.is_active,
        previousGroupIds,
        previousGroupAdminMap,
        nextGroupIds,
        nextGroupAdminMap,
        hasStatusChanged,
        hasMembershipChanged,
        hasGroupAdminChanged,
      });
      setInfo(`User ${editUserForm.username} updated.`);
      setIsEditUserDialogOpen(false);
      setEditUserForm(EMPTY_EDIT_USER_FORM);
      setEditUserOriginal(null);
    } catch (error) {
      showSnackbar(getApiErrorMessage(error, 'Unable to update user'), { severity: 'error', title: 'Update failed', autoHideDuration: 7000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteUserDialog = (user) => {
    setUserPendingDelete(user);
  };

  const handleCloseDeleteUserDialog = () => {
    if (isSubmitting) return;
    setUserPendingDelete(null);
  };

  const handleDeleteUser = async () => {
    if (!userPendingDelete) return;
    setIsSubmitting(true);
    try {
      await deleteAdminUserMutation({ userId: userPendingDelete.id });
      setInfo(`User ${userPendingDelete.username} deleted.`);
      setUserPendingDelete(null);
    } catch (error) {
      setError(error, 'Unable to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    if (!newGroupForm.realm_id || !newGroupForm.name) {
      setActionError('Realm and group name are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createAdminGroupMutation(newGroupForm);
      setNewGroupForm((prev) => ({ ...EMPTY_GROUP_FORM, realm_id: prev.realm_id }));
      setInfo('Group created.');
      setIsCreateGroupDialogOpen(false);
    } catch (error) {
      setError(error, 'Unable to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreateGroupDialog = () => {
    setIsCreateGroupDialogOpen(true);
  };

  const handleCloseCreateGroupDialog = () => {
    if (isSubmitting) return;
    setIsCreateGroupDialogOpen(false);
  };

  const handleCreateGroupDialogRequestClose = (_event, reason) => {
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      return;
    }
    handleCloseCreateGroupDialog();
  };

  const handleOpenDeleteGroupDialog = (group) => {
    setGroupPendingDelete(group);
  };

  const handleCloseDeleteGroupDialog = () => {
    if (isSubmitting) return;
    setGroupPendingDelete(null);
  };

  const handleDeleteGroup = async () => {
    if (!groupPendingDelete) return;
    setIsSubmitting(true);
    try {
      await deleteAdminGroupMutation({ groupId: groupPendingDelete.id });
      setInfo(`Group ${groupPendingDelete.name} deleted.`);
      setGroupPendingDelete(null);
    } catch (error) {
      setError(error, 'Unable to delete group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditGroupDialog = (group) => {
    setEditGroupForm({
      id: group.id || '',
      realm_id: group.realm_id || '',
      name: group.name || '',
      description: group.description || '',
    });
    setIsEditGroupDialogOpen(true);
  };

  const handleCloseEditGroupDialog = () => {
    if (isSubmitting) return;
    setIsEditGroupDialogOpen(false);
    setEditGroupForm(EMPTY_EDIT_GROUP_FORM);
  };

  const handleEditGroupDialogRequestClose = (_event, reason) => {
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      return;
    }
    handleCloseEditGroupDialog();
  };

  const handleUpdateGroup = async (event) => {
    event.preventDefault();
    const trimmedName = editGroupForm.name.trim();
    const normalizedDescription = editGroupForm.description.trim();

    if (!editGroupForm.id) {
      setActionError('Group ID is missing.');
      return;
    }
    if (!trimmedName) {
      setActionError('Group name is required.');
      return;
    }

    const payload = {
      name: trimmedName,
      description: normalizedDescription || null,
    };

    setIsSubmitting(true);
    try {
      await updateAdminGroupMutation({
        groupId: editGroupForm.id,
        ...payload,
      });
      setInfo(`Group ${trimmedName} updated.`);
      setIsEditGroupDialogOpen(false);
      setEditGroupForm(EMPTY_EDIT_GROUP_FORM);
    } catch (error) {
      setError(error, 'Unable to update group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignUserToGroup = async (event) => {
    event.preventDefault();
    if (!membershipForm.group_id || !membershipForm.user_id) {
      setActionError('Select a group and user.');
      return;
    }

    setIsSubmitting(true);
    try {
      await assignAdminUserToGroupMutation({
        groupId: membershipForm.group_id,
        userId: membershipForm.user_id,
        isGroupAdmin: membershipForm.is_group_admin,
      });
      setInfo(
        membershipForm.is_group_admin
          ? 'User assigned as group admin.'
          : 'User assigned as regular group member.'
      );
      setMembershipForm((prev) => ({ ...EMPTY_MEMBERSHIP_FORM, group_id: prev.group_id }));
    } catch (error) {
      setError(error, 'Unable to assign user to group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignPermissions = async (event) => {
    event.preventDefault();
    if (!permissionForm.group_id || !permissionForm.client_id || permissionForm.permission_codes.length === 0) {
      setActionError('Select a group, client, and at least one permission.');
      return;
    }

    setIsSubmitting(true);
    try {
      await assignAdminGroupPermissionsMutation({
        groupId: permissionForm.group_id,
        clientId: permissionForm.client_id,
        permissionCodes: permissionForm.permission_codes,
      });
      setInfo('Permissions assigned to group.');
    } catch (error) {
      setError(error, 'Unable to assign permissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignDeploymentsToGroup = async (event) => {
    event.preventDefault();
    if (
      !groupDeploymentForm.group_id
      || groupDeploymentForm.deployment_ids.length === 0
      || groupDeploymentForm.permission_codes.length === 0
    ) {
      setActionError('Select a group, at least one deployment, and at least one permission.');
      return;
    }

    const resourceNames = {};
    groupDeploymentForm.deployment_ids.forEach((deploymentId) => {
      resourceNames[deploymentId] = deploymentLabelById[deploymentId] || deploymentId;
    });

    setIsSubmitting(true);
    try {
      await assignAdminGroupResourcePermissionsMutation({
        groupId: groupDeploymentForm.group_id,
        resourceType: DEPLOYMENT_RESOURCE_TYPE,
        resourceExternalIds: groupDeploymentForm.deployment_ids,
        permissionCodes: groupDeploymentForm.permission_codes,
        resourceNames,
      });
      setInfo('Deployment resource permissions saved.');
    } catch (error) {
      setError(error, 'Unable to assign deployment resource permissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignDeploymentsToUser = async (event) => {
    event.preventDefault();
    if (
      !userDeploymentForm.user_id
      || userDeploymentForm.deployment_ids.length === 0
      || userDeploymentForm.permission_codes.length === 0
    ) {
      setActionError('Select a user, at least one deployment, and at least one permission.');
      return;
    }

    const resourceNames = {};
    userDeploymentForm.deployment_ids.forEach((deploymentId) => {
      resourceNames[deploymentId] = deploymentLabelById[deploymentId] || deploymentId;
    });

    setIsSubmitting(true);
    try {
      await assignAdminUserResourcePermissionsMutation({
        userId: userDeploymentForm.user_id,
        resourceType: DEPLOYMENT_RESOURCE_TYPE,
        resourceExternalIds: userDeploymentForm.deployment_ids,
        permissionCodes: userDeploymentForm.permission_codes,
        resourceNames,
      });
      setInfo('Deployment resource permissions saved for user.');
    } catch (error) {
      setError(error, 'Unable to assign deployment resource permissions to user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveUserDeploymentPermissionsForDeployment = async ({
    userId,
    deploymentId,
    permissionCodes,
  }) => {
    if (!userId || !deploymentId) {
      setActionError('User and deployment are required.');
      return false;
    }

    const nextPermissionCodes = Array.from(
      new Set((Array.isArray(permissionCodes) ? permissionCodes : []).filter(Boolean))
    ).sort();
    const existingPermissionCodes = Array.isArray(userDeploymentPermissionsMap[userId]?.[deploymentId])
      ? [...userDeploymentPermissionsMap[userId][deploymentId]]
      : [];
    const permissionCodesToAdd = nextPermissionCodes.filter((code) => !existingPermissionCodes.includes(code));
    const permissionCodesToRemove = existingPermissionCodes.filter((code) => !nextPermissionCodes.includes(code));

    if (permissionCodesToAdd.length === 0 && permissionCodesToRemove.length === 0) {
      setInfo('No deployment permission changes to save.');
      return true;
    }

    setIsSubmitting(true);
    try {
      if (permissionCodesToAdd.length > 0) {
        const deploymentName = deploymentLabelById[deploymentId] || deploymentId;
        await assignAdminUserResourcePermissionsMutation({
          userId,
          resourceType: DEPLOYMENT_RESOURCE_TYPE,
          resourceExternalIds: [deploymentId],
          permissionCodes: permissionCodesToAdd,
          resourceNames: {
            [deploymentId]: deploymentName,
          },
        });
      }
      if (permissionCodesToRemove.length > 0) {
        await Promise.all(
          permissionCodesToRemove.map((permissionCode) =>
            removeAdminUserResourcePermissionMutation({
              userId,
              resourceExternalId: deploymentId,
              permissionCode,
              resourceType: DEPLOYMENT_RESOURCE_TYPE,
            })
          )
        );
      }
      const username = users.find((user) => user.id === userId)?.username || 'user';
      setInfo(`Deployment permissions updated for ${username}.`);
      return true;
    } catch (error) {
      setError(error, 'Unable to update deployment resource permissions for user');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveDeploymentFromGroup = async (groupId, deploymentId) => {
    const assignmentMap = groupDeploymentPermissionsMap[groupId] || {};
    const permissionCodes = Array.isArray(assignmentMap[deploymentId]) ? assignmentMap[deploymentId] : [];
    if (permissionCodes.length === 0) {
      return;
    }
    setIsSubmitting(true);
    try {
      await Promise.all(
        permissionCodes.map((permissionCode) =>
          removeAdminGroupResourcePermissionMutation({
            groupId,
            resourceExternalId: deploymentId,
            permissionCode,
            resourceType: DEPLOYMENT_RESOURCE_TYPE,
          })
        )
      );
      setInfo('Deployment resource permissions removed from group.');
    } catch (error) {
      setError(error, 'Unable to remove deployment resource permissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveDeploymentFromUser = async (userId, deploymentId) => {
    const assignmentMap = userDeploymentPermissionsMap[userId] || {};
    const permissionCodes = Array.isArray(assignmentMap[deploymentId]) ? assignmentMap[deploymentId] : [];
    if (permissionCodes.length === 0) {
      return;
    }
    setIsSubmitting(true);
    try {
      await Promise.all(
        permissionCodes.map((permissionCode) =>
          removeAdminUserResourcePermissionMutation({
            userId,
            resourceExternalId: deploymentId,
            permissionCode,
            resourceType: DEPLOYMENT_RESOURCE_TYPE,
          })
        )
      );
      setInfo('Deployment resource permissions removed from user.');
    } catch (error) {
      setError(error, 'Unable to remove deployment resource permissions from user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRealm = async (event) => {
    event.preventDefault();

    const slug = newRealmForm.slug.trim();
    const name = newRealmForm.name.trim();
    const clientId = newRealmForm.client_id.trim();
    if (!slug || !name) {
      setActionError('Realm slug and name are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const createdRealm = await createAdminRealmMutation({
        slug,
        name,
        client_id: clientId || null,
        redirect_uris: parseCommaSeparatedValues(newRealmForm.redirect_uris),
      });
      setNewRealmForm(EMPTY_REALM_CREATE_FORM);
      if (createdRealm?.client_id) {
        setInfo(`Realm created with bootstrap client ${createdRealm.client_id}.`);
      } else {
        setInfo('Realm created.');
      }
    } catch (error) {
      setError(error, 'Unable to create realm');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOAuthClient = async (event) => {
    event.preventDefault();

    const realmId = newOAuthClientForm.realm_id;
    const clientId = newOAuthClientForm.client_id.trim();
    if (!realmId || !clientId) {
      setActionError('Realm and client id are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const scopes = parseCommaSeparatedValues(newOAuthClientForm.scopes);
      const createdClient = await createAdminOAuthClientMutation({
        realm_id: realmId,
        client_id: clientId,
        redirect_uris: parseCommaSeparatedValues(newOAuthClientForm.redirect_uris),
        scopes,
      });
      setNewOAuthClientForm((prev) => ({
        ...EMPTY_OAUTH_CLIENT_CREATE_FORM,
        realm_id: prev.realm_id || realmId,
      }));
      setInfo(`OAuth client ${createdClient?.client_id || clientId} created.`);
    } catch (error) {
      setError(error, 'Unable to create OAuth client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRotateKey = async () => {
    setIsSubmitting(true);
    try {
      const response = await rotateAdminSigningKeyMutation();
      setInfo(`Signing key rotated. Active kid: ${response?.kid}`);
    } catch (error) {
      setError(error, 'Unable to rotate signing key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const userColumns = useMemo(
    () => [
      { field: 'username', headerName: 'Username', flex: 1, minWidth: 180 },
      { field: 'realm_id', headerName: 'Realm ID', minWidth: 220, flex: 1 },
      {
        field: 'is_superuser',
        headerName: 'Superuser',
        width: 110,
        renderCell: (params) => (params.value ? 'yes' : 'no'),
      },
      {
        field: 'is_group_admin',
        headerName: 'Group Admin',
        width: 130,
        renderCell: (params) => (
          (
            (Array.isArray(params.row?.admin_group_ids) && params.row.admin_group_ids.length > 0)
            || Boolean(params.row?.is_group_admin)
          )
            ? 'yes'
            : 'no'
        ),
      },
      {
        field: 'is_active',
        headerName: 'Status',
        width: 100,
        renderCell: (params) => (params.value ? 'active' : 'disabled'),
      },
      {
        field: 'groups',
        headerName: 'Groups',
        minWidth: 220,
        flex: 1,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5} sx={{ overflow: 'hidden', flexWrap: 'wrap' }}>
            {(params.value || []).map((group) => (
              <Chip key={group} size="small" label={group} />
            ))}
          </Stack>
        ),
      },
      {
        field: 'permissions',
        headerName: 'Group Permissions',
        minWidth: 140,
        flex: 1,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5} sx={{ overflow: 'hidden', flexWrap: 'wrap' }}>
            {(params.value || []).map((permission) => (
              <Chip key={permission} size="small" color="info" label={permission} />
            ))}
          </Stack>
        ),
      },
      {
        field: 'created_at',
        headerName: 'Created',
        width: 160,
        renderCell: (params) => formatDateTime(params.value),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 230,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1}>
            <Tooltip title="Edit user">
              <span>
                <IconButton
                  size="small"
                  color="primary"
                  aria-label="Edit user"
                  disabled={isSubmitting || (!isSuperuser && params.row.is_superuser)}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleOpenEditUserDialog(params.row);
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            {canManageDeploymentResourcePermissions ? (
              <Tooltip title="Assign deployment permissions">
                <span>
                  <IconButton
                    size="small"
                    color="secondary"
                    aria-label="Assign deployment permissions"
                    disabled={isSubmitting || (!isSuperuser && params.row.is_superuser)}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenUserDeploymentPermissionsDialog(params.row);
                    }}
                  >
                    <AdminPanelSettingsOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            ) : null}
            <IconButton
              size="small"
              color="error"
              aria-label="Delete user"
              disabled={isSubmitting || (!isSuperuser && params.row.is_superuser)}
              onClick={(event) => {
                event.stopPropagation();
                handleOpenDeleteUserDialog(params.row);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ),
      },
    ],
    [canManageDeploymentResourcePermissions, isSubmitting, isSuperuser]
  );

  const fteColumns = useMemo(
    () => [
      {
        field: 'deployment_name',
        headerName: 'Flow / Deployment',
        flex: 1.2,
        minWidth: 220,
      },
      {
        field: 'runs_completed',
        headerName: 'Runs Completed',
        type: 'number',
        minWidth: 140,
        valueFormatter: (value) => formatInteger(value),
      },
      {
        field: 'human_time_per_run_minutes',
        headerName: 'Human Time per Run (min)',
        type: 'number',
        minWidth: 205,
        valueFormatter: (value) => formatDecimal(value, 1),
      },
      {
        field: 'avg_bot_time_minutes',
        headerName: 'Avg Bot Time (min)',
        type: 'number',
        minWidth: 180,
        valueFormatter: (value) => formatDecimal(value, 1),
      },
      {
        field: 'total_hours_saved',
        headerName: 'Total Hours Saved',
        type: 'number',
        minWidth: 155,
        valueFormatter: (value) => formatDecimal(value, 1),
      },
      {
        field: 'fte_saved',
        headerName: 'FTE Saved',
        type: 'number',
        minWidth: 110,
        valueFormatter: (value) => formatDecimal(value, 2),
      },
      {
        field: 'est_cost_avoided',
        headerName: 'Est. Cost Avoided',
        type: 'number',
        minWidth: 160,
        valueFormatter: (value) => formatUsd(value),
      },
    ],
    [],
  );

  const groupColumns = useMemo(
    () => [
      { field: 'name', headerName: 'Group', minWidth: 180, flex: 1 },
      { field: 'realm_id', headerName: 'Realm ID', minWidth: 220, flex: 1 },
      {
        field: 'permissions',
        headerName: 'Permissions',
        minWidth: 260,
        flex: 1,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5} sx={{ overflow: 'hidden', flexWrap: 'wrap' }}>
            {(params.value || []).map((permission) => (
              <Chip key={permission} size="small" color="success" label={permission} />
            ))}
          </Stack>
        ),
      },
      {
        field: 'created_at',
        headerName: 'Created',
        width: 180,
        renderCell: (params) => formatDateTime(params.value),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 150,
        sortable: false,
        filterable: false,
        renderCell: (params) =>
          isSuperuser ? (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Edit group">
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    aria-label="Edit group"
                    disabled={isSubmitting}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenEditGroupDialog(params.row);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Delete group">
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    aria-label="Delete group"
                    disabled={isSubmitting}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenDeleteGroupDialog(params.row);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          ) : (
            ''
          ),
      },
    ],
    [isSubmitting, isSuperuser]
  );

  const permissionMatrixColumns = useMemo(
    () => [
      {
        field: 'group_name',
        headerName: 'Group',
        minWidth: 180,
        flex: 0.9,
      },
      {
        field: 'username',
        headerName: 'User',
        minWidth: 180,
        flex: 0.9,
      },
      {
        field: 'deployment_name',
        headerName: 'Deployment',
        minWidth: 220,
        flex: 1.1,
      },
      {
        field: 'group_permissions',
        headerName: 'Group Permissions',
        minWidth: 260,
        flex: 1,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5} sx={{ overflow: 'hidden', flexWrap: 'wrap' }}>
            {(params.value || []).map((permissionCode) => (
              <Chip key={permissionCode} size="small" color="success" label={permissionCode} />
            ))}
          </Stack>
        ),
      },
      {
        field: 'direct_user_permissions',
        headerName: 'User Permissions',
        minWidth: 240,
        flex: 1,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5} sx={{ overflow: 'hidden', flexWrap: 'wrap' }}>
            {(params.value || []).map((permissionCode) => (
              <Chip key={permissionCode} size="small" color="info" label={permissionCode} />
            ))}
          </Stack>
        ),
      },
      {
        field: 'effective_permissions',
        headerName: 'Effective Permissions',
        minWidth: 280,
        flex: 1.2,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5} sx={{ overflow: 'hidden', flexWrap: 'wrap' }}>
            {(params.value || []).map((permissionCode) => (
              <Chip key={permissionCode} size="small" color="primary" label={permissionCode} />
            ))}
          </Stack>
        ),
      },
      // {
      //   field: 'source',
      //   headerName: 'Source',
      //   minWidth: 140,
      //   width: 150,
      // },
    ],
    [],
  );

  const realmColumns = useMemo(
    () => [
      { field: 'slug', headerName: 'Realm Slug', minWidth: 180, flex: 1 },
      { field: 'name', headerName: 'Name', minWidth: 180, flex: 1 },
      { field: 'id', headerName: 'Realm ID', minWidth: 260, flex: 1.2 },
      {
        field: 'is_active',
        headerName: 'Status',
        width: 110,
        renderCell: (params) => (params.value ? 'active' : 'disabled'),
      },
    ],
    [],
  );

  const oauthClientColumns = useMemo(
    () => [
      { field: 'client_id', headerName: 'Client ID', minWidth: 180, flex: 1 },
      { field: 'realm_id', headerName: 'Realm ID', minWidth: 220, flex: 1 },
      {
        field: 'is_confidential',
        headerName: 'Confidential',
        width: 130,
        renderCell: (params) => (params.value ? 'yes' : 'no'),
      },
      {
        field: 'scopes',
        headerName: 'Scopes',
        minWidth: 260,
        flex: 1,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5} sx={{ overflow: 'hidden', flexWrap: 'wrap' }}>
            {(params.value || []).map((scope) => (
              <Chip key={scope} size="small" label={scope} />
            ))}
          </Stack>
        ),
      },
      {
        field: 'redirect_uris',
        headerName: 'Redirect URIs',
        minWidth: 320,
        flex: 1.2,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5} sx={{ overflow: 'hidden', flexWrap: 'wrap' }}>
            {(params.value || []).map((uri) => (
              <Chip key={uri} size="small" color="info" label={uri} />
            ))}
          </Stack>
        ),
      },
      {
        field: 'created_at',
        headerName: 'Created',
        width: 170,
        renderCell: (params) => formatDateTime(params.value),
      },
    ],
    [],
  );

  const isRealmDataLoading = (isSuperuser || isGroupAdmin) && (
    isUsersLoading
    || isGroupsLoading
    || isPermissionsLoading
    || isRealmsLoading
    || (canManageDeploymentResourcePermissions && isPrefectDeploymentsLoading)
  );
  const isRealmClientDataLoading = isSuperuser && tab === 'realms' && isOAuthClientsLoading;
  const combinedLoadError = (
    usersLoadError
    || groupsLoadError
    || permissionsLoadError
    || realmsLoadError
    || (canManageDeploymentResourcePermissions ? prefectDeploymentsLoadError : null)
    || (tab === 'matrix' ? permissionMatrixLoadError : null)
    || (tab === 'realms' ? oauthClientsLoadError : null)
  );

  if (isRealmDataLoading || isRealmClientDataLoading) {
    return <LoadingMsg msg="Loading admin dashboard..." color="" />;
  }

  if (combinedLoadError) {
    const msg = getApiErrorMessage(combinedLoadError, 'Unable to load dashboard data');
    return (
      <Container maxWidth="lg" sx={{ mt: 3 }}>
        <Alert severity="error">{msg}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 6 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4">Admin Dashboard</Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {isSuperuser
              ? 'Manage all users, groups, permissions, realms, OAuth clients, and signing keys.'
              : isGroupAdmin
              ? 'Manage users and permissions for the groups you administer.'
              : 'You do not have administrative permissions.'}
          </Typography>
        </Box>

        {actionError ? <Alert severity="error">{actionError}</Alert> : null}

        <Tabs value={tab} onChange={(_, value) => setTab(value)}>
          {/* <Tab label="Users" value="users" /> */}
          <Tab label="Users" value="matrix" />
          <Tab label="Groups" value="groups" />
          {/* {canManageDeploymentResourcePermissions ? <Tab label="Permission Matrix" value="matrix" /> : null} */}
          {/* {isSuperuser || isGroupAdmin ? <Tab label="FTE" value="fte" /> : null} */}
          {/* {isSuperuser ? <Tab label="Realms & Clients" value="realms" /> : null} */}
          {/* Keys tab removed: KC manages signing keys via its own admin UI */}
        </Tabs>

        {tab === 'users' ? (
          <Stack spacing={2}>
            {/* {canManageDeploymentResourcePermissions ? (
              <DashboardUserDeploymentPermissionsCard
                isSubmitting={isSubmitting}
                users={users}
                userDeploymentForm={userDeploymentForm}
                setUserDeploymentForm={setUserDeploymentForm}
                userDeploymentPermissionsMap={userDeploymentPermissionsMap}
                deploymentPermissionOptions={DEPLOYMENT_PERMISSION_OPTIONS}
                defaultDeploymentPermissionCodes={DEFAULT_DEPLOYMENT_PERMISSION_CODES}
                prefectDeployments={prefectDeployments}
                deploymentLabelById={deploymentLabelById}
                selectedUserDeploymentIds={selectedUserDeploymentIds}
                selectedUserDeploymentAssignments={selectedUserDeploymentAssignments}
                onAssignDeploymentsToUser={handleAssignDeploymentsToUser}
                onRemoveDeploymentFromUser={handleRemoveDeploymentFromUser}
              />
            ) : null} */}

            <DashboardTooltipIconButton
              title="Create user"
              ariaLabel="Create user"
              onClick={handleOpenCreateUserDialog}
              disabled={isSubmitting}
            >
              <AddIcon />
            </DashboardTooltipIconButton>

            <Card
              variant="outlined"
              sx={(theme) => ({
                ...theme.customStyles.dashboard.dataGrid.card,
                width: '100%',
                height: 520,
              })}
            >
              <DataGrid
                rows={users}
                columns={userColumns}
                getRowId={(row) => row.id}
                disableRowSelectionOnClick
                sx={(theme) => theme.customStyles.dashboard.dataGrid.grid}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: { paginationModel: { page: 0, pageSize: 10 } },
                }}
              />
            </Card>
          </Stack>
        ) : null}

        {tab === 'groups' ? (
          <DashboardGroupsTab
            isSuperuser={isSuperuser}
            canManageDeploymentResourcePermissions={canManageDeploymentResourcePermissions}
            isSubmitting={isSubmitting}
            groups={groups}
            users={users}
            membershipForm={membershipForm}
            setMembershipForm={setMembershipForm}
            permissionForm={permissionForm}
            setPermissionForm={setPermissionForm}
            permissionClientIds={permissionClientIds}
            filteredPermissions={filteredPermissions}
            groupDeploymentForm={groupDeploymentForm}
            setGroupDeploymentForm={setGroupDeploymentForm}
            groupDeploymentPermissionsMap={groupDeploymentPermissionsMap}
            deploymentPermissionOptions={DEPLOYMENT_PERMISSION_OPTIONS}
            defaultDeploymentPermissionCodes={DEFAULT_DEPLOYMENT_PERMISSION_CODES}
            prefectDeployments={prefectDeployments}
            deploymentLabelById={deploymentLabelById}
            selectedGroupDeploymentIds={selectedGroupDeploymentIds}
            selectedGroupDeploymentAssignments={selectedGroupDeploymentAssignments}
            groupColumns={groupColumns}
            onAssignUserToGroup={handleAssignUserToGroup}
            onAssignPermissions={handleAssignPermissions}
            onAssignDeploymentsToGroup={handleAssignDeploymentsToGroup}
            onRemoveDeploymentFromGroup={handleRemoveDeploymentFromGroup}
            onOpenCreateGroupDialog={handleOpenCreateGroupDialog}
          />
        ) : null}

        {tab === 'matrix' && canManageDeploymentResourcePermissions ? (
          <Stack spacing={1.5} >
            {/* <Box>
              <Typography variant="subtitle1">Deployment Permission Matrix</Typography>
              <Typography variant="caption" color="text.secondary">
                Flat matrix of group memberships, users, deployments, and direct plus inherited permissions.
              </Typography>
            </Box> */}
            {/* <Typography variant="body2" color="text.secondary">
              Rows: {permissionMatrixTotalRows}
            </Typography> */}
            {/* <Card
              variant="outlined"
              sx={(theme) => ({
                ...theme.customStyles.dashboard.dataGrid.card,
                width: '100%',
                height: '100%',
              })}
            >
              <DataGrid
                rows={permissionMatrixRows}
                columns={permissionMatrixColumns}
                getRowId={(row) => row.id}
                disableRowSelectionOnClick
                sx={(theme) => theme.customStyles.dashboard.dataGrid.grid}
                pageSizeOptions={[25, 50, 100]}
                showToolbar
                slotProps={{
                  toolbar: {
                    showQuickFilter: true,
                    quickFilterProps: { debounceMs: 300 },
                  },
                }}
                initialState={{
                  pagination: { paginationModel: { page: 0, pageSize: 25 } },
                }}
              />
            </Card> */}
            <Card
              variant="outlined"
              sx={(theme) => ({
                ...theme.customStyles.dashboard.dataGrid.card,
                width: '100%',
                height: '100%',
              })}
            >
              <GroupTable
                data={permissionMatrixRowsWithDeploymentLabels}
                onEdit={(row) => {
                  const user = userById[row.user_id];
                  if (user) handleOpenEditUserDialog(user);
                }}
                onAssignDeploymentPermissions={(row) => {
                  const user = userById[row.user_id];
                  if (!user) return;
                  handleOpenUserDeploymentPermissionsDialog(user);
                }}
                isAssignDeploymentPermissionsDisabled={(row) => {
                  const user = userById[row.user_id];
                  return !user || (!isSuperuser && Boolean(user.is_superuser));
                }}
                disableAssignDeploymentPermissions={isSubmitting}
                onDeleteUser={(row) => {
                  const user = userById[row.user_id];
                  if (!user) return;
                  handleOpenDeleteUserDialog(user);
                }}
                isDeleteUserDisabled={(row) => {
                  const user = userById[row.user_id];
                  return !user || (!isSuperuser && Boolean(user.is_superuser));
                }}
                disableDeleteUser={isSubmitting}
                onDeleteGroup={
                  isSuperuser
                    ? (row) => {
                      if (!row.group_id) return;
                      const group = groupById[row.group_id];
                      handleOpenDeleteGroupDialog(
                        group || {
                          id: row.group_id,
                          name: row.group_name || row.group_id,
                        }
                      );
                    }
                    : undefined
                }
                disableDeleteGroup={isSubmitting}
                onCreateUser={handleOpenCreateUserDialog}
                disableCreateUser={isSubmitting}
                onCreateGroup={isSuperuser ? handleOpenCreateGroupDialog : undefined}
                disableCreateGroup={isSubmitting}
                pageIndex={permissionMatrixPageIndex}
                pageSize={permissionMatrixPageSize}
                totalRows={permissionMatrixTotalRows}
                onPageChange={setPermissionMatrixPageIndex}
                onPageSizeChange={(nextPageSize) => {
                  setPermissionMatrixPageSize(nextPageSize);
                  setPermissionMatrixPageIndex(0);
                }}
                sortBy={permissionMatrixSortBy}
                sortDir={permissionMatrixSortDir}
                onSortChange={({ sortBy, sortDir }) => {
                  setPermissionMatrixSortBy(sortBy);
                  setPermissionMatrixSortDir(sortDir);
                  setPermissionMatrixPageIndex(0);
                }}
                isLoading={isPermissionMatrixLoading}
                // initialGrouping={['group_name', 'deployment_name']}  // optional, defaults to []
              />
            </Card>
          </Stack>
        ) : null}

        {tab === 'fte' ? (
          <Stack spacing={2}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Box>
                <Typography variant="subtitle1">FTE Summary</Typography>
                <Typography variant="caption" color="text.secondary">
                  Completed runs aggregated from Prefect and FTE assumptions.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {FTE_WINDOW_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    size="small"
                    label={option.label}
                    clickable
                    onClick={() => setFteWindow(option.value)}
                    color={fteWindow === option.value ? 'info' : 'default'}
                    variant={fteWindow === option.value ? 'filled' : 'outlined'}
                  />
                ))}
              </Stack>
            </Box>

            {isFteSummaryError ? (
              <Alert severity="error">
                {getApiErrorMessage(fteSummaryError, 'Unable to load FTE summary')}
              </Alert>
            ) : null}

            <Card
              variant="outlined"
              sx={(theme) => ({
                ...theme.customStyles.dashboard.dataGrid.card,
                width: '100%',
                height: 520,
              })}
            >
              <DataGrid
                rows={fteSummaryRows}
                columns={fteColumns}
                getRowId={(row) => row.deployment_id}
                disableRowSelectionOnClick
                sx={(theme) => theme.customStyles.dashboard.dataGrid.grid}
                loading={isFteSummaryLoading}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: { paginationModel: { page: 0, pageSize: 10 } },
                }}
              />
            </Card>
          </Stack>
        ) : null}

        {tab === 'realms' && isSuperuser ? (
          <Stack spacing={2}>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Stack
                component="form"
                spacing={2}
                onSubmit={handleCreateRealm}
              >
                <Box>
                  <Typography variant="h6">Create Realm</Typography>
                  <Typography color="text.secondary">
                    Create a realm and optionally provide bootstrap client settings.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="Realm slug"
                    value={newRealmForm.slug}
                    onChange={(event) =>
                      setNewRealmForm((prev) => ({ ...prev, slug: event.target.value }))
                    }
                    required
                    fullWidth
                    disabled={isSubmitting}
                  />
                  <TextField
                    label="Realm name"
                    value={newRealmForm.name}
                    onChange={(event) =>
                      setNewRealmForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    required
                    fullWidth
                    disabled={isSubmitting}
                  />
                  <TextField
                    label="Bootstrap client id (optional)"
                    value={newRealmForm.client_id}
                    onChange={(event) =>
                      setNewRealmForm((prev) => ({ ...prev, client_id: event.target.value }))
                    }
                    fullWidth
                    disabled={isSubmitting}
                  />
                </Stack>
                <TextField
                  label="Redirect URIs (comma separated)"
                  value={newRealmForm.redirect_uris}
                  onChange={(event) =>
                    setNewRealmForm((prev) => ({ ...prev, redirect_uris: event.target.value }))
                  }
                  placeholder="http://localhost:3002/login/callback, http://localhost:3002"
                  fullWidth
                  disabled={isSubmitting}
                />
                <Box>
                  <Button type="submit" variant="contained" disabled={isSubmitting}>
                    Create Realm
                  </Button>
                </Box>
              </Stack>
            </Card>

            <Card variant="outlined" sx={{ p: 2 }}>
              <Stack
                component="form"
                spacing={2}
                onSubmit={handleCreateOAuthClient}
              >
                <Box>
                  <Typography variant="h6">Create OAuth Client</Typography>
                  <Typography color="text.secondary">
                    Register an additional OAuth client inside an existing realm.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel id="create-oauth-client-realm-label">Realm</InputLabel>
                    <Select
                      labelId="create-oauth-client-realm-label"
                      value={newOAuthClientForm.realm_id}
                      label="Realm"
                      disabled={isSubmitting || realms.length === 0}
                      onChange={(event) =>
                        setNewOAuthClientForm((prev) => ({ ...prev, realm_id: event.target.value }))
                      }
                    >
                      {realms.map((realm) => (
                        <MenuItem key={realm.id} value={realm.id}>
                          {realm.slug}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Client id"
                    value={newOAuthClientForm.client_id}
                    onChange={(event) =>
                      setNewOAuthClientForm((prev) => ({ ...prev, client_id: event.target.value }))
                    }
                    required
                    fullWidth
                    disabled={isSubmitting || realms.length === 0}
                  />
                </Stack>
                <TextField
                  label="Redirect URIs (comma separated)"
                  value={newOAuthClientForm.redirect_uris}
                  onChange={(event) =>
                    setNewOAuthClientForm((prev) => ({ ...prev, redirect_uris: event.target.value }))
                  }
                  placeholder="http://localhost:3002/login/callback, http://localhost:3002"
                  fullWidth
                  disabled={isSubmitting || realms.length === 0}
                />
                <TextField
                  label="Scopes (comma separated)"
                  value={newOAuthClientForm.scopes}
                  onChange={(event) =>
                    setNewOAuthClientForm((prev) => ({ ...prev, scopes: event.target.value }))
                  }
                  fullWidth
                  disabled={isSubmitting || realms.length === 0}
                />
                <Box>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting || realms.length === 0}
                  >
                    Create OAuth Client
                  </Button>
                </Box>
              </Stack>
            </Card>

            <Card
              variant="outlined"
              sx={(theme) => ({
                ...theme.customStyles.dashboard.dataGrid.card,
                width: '100%',
                height: 340,
              })}
            >
              <DataGrid
                rows={realms}
                columns={realmColumns}
                getRowId={(row) => row.id}
                disableRowSelectionOnClick
                sx={(theme) => theme.customStyles.dashboard.dataGrid.grid}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: { paginationModel: { page: 0, pageSize: 10 } },
                }}
              />
            </Card>

            <Card
              variant="outlined"
              sx={(theme) => ({
                ...theme.customStyles.dashboard.dataGrid.card,
                width: '100%',
                height: 420,
                p: 2,
              })}
            >
              <Stack spacing={2} sx={{ height: '100%' }}>
                <Box sx={{ maxWidth: 320 }}>
                  <FormControl fullWidth>
                    <InputLabel id="oauth-clients-realm-filter-label">Realm filter</InputLabel>
                    <Select
                      labelId="oauth-clients-realm-filter-label"
                      value={oauthClientRealmFilter}
                      label="Realm filter"
                      disabled={isSubmitting}
                      onChange={(event) => setOauthClientRealmFilter(event.target.value)}
                    >
                      <MenuItem value="all">All realms</MenuItem>
                      {realms.map((realm) => (
                        <MenuItem key={realm.id} value={realm.id}>
                          {realm.slug}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <DataGrid
                    rows={oauthClients}
                    columns={oauthClientColumns}
                    getRowId={(row) => row.id}
                    disableRowSelectionOnClick
                    sx={(theme) => theme.customStyles.dashboard.dataGrid.grid}
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{
                      pagination: { paginationModel: { page: 0, pageSize: 10 } },
                    }}
                  />
                </Box>
              </Stack>
            </Card>
          </Stack>
        ) : null}

        <DashboardCreateUserDialog
          open={isCreateUserDialogOpen}
          onClose={handleCloseCreateUserDialog}
          onRequestClose={handleCreateUserDialogRequestClose}
          onSubmit={handleCreateUser}
          isSubmitting={isSubmitting}
          isSuperuser={isSuperuser}
          newUserForm={newUserForm}
          setNewUserForm={setNewUserForm}
          selectedCreateUserGroup={selectedCreateUserGroup}
          groups={groups}
          realms={realms}
        />

        <DashboardEditUserDialog
          open={isEditUserDialogOpen}
          onClose={handleCloseEditUserDialog}
          onRequestClose={handleEditUserDialogRequestClose}
          onSubmit={handleUpdateUser}
          isSubmitting={isSubmitting}
          isSuperuser={isSuperuser}
          editUserForm={editUserForm}
          setEditUserForm={setEditUserForm}
          editUserSelectedGroupIds={editUserSelectedGroupIds}
          groups={groups}
          groupLabelById={groupLabelById}
        />

        {canManageDeploymentResourcePermissions ? (
          <DashboardUserDeploymentPermissionsDialog
            open={isUserDeploymentPermissionsDialogOpen}
            onClose={handleCloseUserDeploymentPermissionsDialog}
            isSubmitting={isSubmitting}
            user={selectedUserDeploymentPermissionsUser}
            prefectDeployments={prefectDeployments}
            deploymentLabelById={deploymentLabelById}
            userDeploymentPermissionsMap={userDeploymentPermissionsMap}
            deploymentPermissionOptions={DEPLOYMENT_PERMISSION_OPTIONS}
            defaultDeploymentPermissionCodes={DEFAULT_DEPLOYMENT_PERMISSION_CODES}
            onSaveDeploymentPermissions={handleSaveUserDeploymentPermissionsForDeployment}
          />
        ) : null}

        {isSuperuser ? (
          <DashboardCreateGroupDialog
            open={isCreateGroupDialogOpen}
            onClose={handleCloseCreateGroupDialog}
            onRequestClose={handleCreateGroupDialogRequestClose}
            onSubmit={handleCreateGroup}
            isSubmitting={isSubmitting}
            newGroupForm={newGroupForm}
            setNewGroupForm={setNewGroupForm}
            realms={realms}
          />
        ) : null}

        {isSuperuser ? (
          <DashboardEditGroupDialog
            open={isEditGroupDialogOpen}
            onClose={handleCloseEditGroupDialog}
            onRequestClose={handleEditGroupDialogRequestClose}
            onSubmit={handleUpdateGroup}
            isSubmitting={isSubmitting}
            editGroupForm={editGroupForm}
            setEditGroupForm={setEditGroupForm}
          />
        ) : null}

        <DashboardConfirmDeleteDialog
          open={Boolean(userPendingDelete)}
          onClose={handleCloseDeleteUserDialog}
          onConfirm={handleDeleteUser}
          isSubmitting={isSubmitting}
          title="Delete User"
          entityLabel={`user "${userPendingDelete?.username || ''}"`}
        />

        {isSuperuser ? (
          <DashboardConfirmDeleteDialog
            open={Boolean(groupPendingDelete)}
            onClose={handleCloseDeleteGroupDialog}
            onConfirm={handleDeleteGroup}
            isSubmitting={isSubmitting}
            title="Delete Group"
            entityLabel={`group "${groupPendingDelete?.name || ''}"`}
          />
        ) : null}
        {tab === 'keys' && isSuperuser ? (
          <Card variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Signing Key Rotation</Typography>
              <Typography color="text.secondary">
                Rotate the active JWT signing key. Existing tokens remain verifiable by published JWKS keys
                until they expire.
              </Typography>
              <Box>
                <Button variant="contained" onClick={handleRotateKey} disabled={isSubmitting}>
                  Rotate Signing Key
                </Button>
              </Box>
            </Stack>
          </Card>
        ) : null}
      </Stack>
    </Container>
  );
}
