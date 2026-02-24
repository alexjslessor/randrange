import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DashboardTooltipIconButton from './DashboardTooltipIconButton';

const CYBER_ACTION_CARD_SX = (theme) => theme.customStyles.dashboard.dialog.actionCard;

const CYBER_ACTION_CARD_TITLE_SX = {
  fontWeight: 800,
  letterSpacing: '0.02em',
};

const CYBER_GROUP_FIELD_SX = (theme) => ({
  ...theme.customStyles.dashboard.dialog.field,
  '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(var(--brand-blue-rgb), 0.65)',
  },
  '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(var(--brand-blue-rgb), 0.95)',
    boxShadow: '0 0 0 2px rgba(var(--brand-blue-rgb), 0.16)',
  },
});

const CYBER_DIVIDER_SX = {
  height: 1,
  width: '100%',
  mt: 1.25,
  background: 'linear-gradient(90deg, rgba(var(--brand-blue-rgb), 0.55), rgba(143,42,163,0.24), transparent)',
};

const CYBER_PRIMARY_BUTTON_SX = (theme) => theme.customStyles.dashboard.dialog.primaryButton;

const CYBER_ASSIGNMENT_CHIP_SX = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  boxShadow: 'inset 0 0 0 1px rgba(var(--brand-blue-rgb), 0.26)',
  '&:hover': {
    backgroundColor: 'rgba(var(--brand-blue-rgb), 0.12)',
  },
  '& .MuiChip-deleteIcon': {
    color: 'rgba(255,255,255,0.55)',
    '&:hover': {
      color: 'rgba(var(--brand-blue-rgb), 0.95)',
    },
  },
};

export default function DashboardGroupsTab({
  isSuperuser,
  canManageDeploymentResourcePermissions,
  isSubmitting,
  groups,
  users,
  membershipForm,
  setMembershipForm,
  permissionForm,
  setPermissionForm,
  permissionClientIds,
  filteredPermissions,
  groupDeploymentForm,
  setGroupDeploymentForm,
  groupDeploymentPermissionsMap,
  deploymentPermissionOptions,
  defaultDeploymentPermissionCodes,
  prefectDeployments,
  deploymentLabelById,
  selectedGroupDeploymentIds,
  selectedGroupDeploymentAssignments,
  groupColumns,
  onAssignUserToGroup,
  onAssignPermissions,
  onAssignDeploymentsToGroup,
  onRemoveDeploymentFromGroup,
  onOpenCreateGroupDialog,
}) {
  return (
    <Stack spacing={2}>
      {/* <Card variant="outlined" sx={CYBER_ACTION_CARD_SX}>
        <Box sx={{ mb: 1.75 }}>
          <Typography variant="h6" sx={CYBER_ACTION_CARD_TITLE_SX}>
            Assign User to Group
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add a user to a group and optionally grant group admin access.
          </Typography>
          <Box sx={CYBER_DIVIDER_SX} />
        </Box>
        <Box component="form" onSubmit={onAssignUserToGroup}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <FormControl fullWidth sx={CYBER_GROUP_FIELD_SX}>
              <InputLabel id="group-for-membership-label">Group</InputLabel>
              <Select
                labelId="group-for-membership-label"
                label="Group"
                value={membershipForm.group_id}
                onChange={(event) =>
                  setMembershipForm((prev) => ({ ...prev, group_id: event.target.value }))
                }
              >
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={CYBER_GROUP_FIELD_SX}>
              <InputLabel id="user-for-membership-label">User</InputLabel>
              <Select
                labelId="user-for-membership-label"
                label="User"
                value={membershipForm.user_id}
                onChange={(event) =>
                  setMembershipForm((prev) => ({ ...prev, user_id: event.target.value }))
                }
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={membershipForm.is_group_admin}
                  sx={{
                    '&.Mui-checked': {
                      color: 'var(--brand-blue)',
                    },
                  }}
                  onChange={(event) =>
                    setMembershipForm((prev) => ({
                      ...prev,
                      is_group_admin: event.target.checked,
                    }))
                  }
                />
              }
              label="Group Admin"
            />
            <Button type="submit" variant="contained" disabled={isSubmitting} sx={CYBER_PRIMARY_BUTTON_SX}>
              Assign
            </Button>
          </Stack>
        </Box>
      </Card> */}

      <Card variant="outlined" sx={CYBER_ACTION_CARD_SX}>
        <Box sx={{ mb: 1.75 }}>
          <Typography variant="h6" sx={CYBER_ACTION_CARD_TITLE_SX}>
            Assign Permissions to Group
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Grant one or more permission codes to a group for a specific client.
          </Typography>
          <Box sx={CYBER_DIVIDER_SX} />
        </Box>
        <Box component="form" onSubmit={onAssignPermissions}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <FormControl fullWidth sx={CYBER_GROUP_FIELD_SX}>
              <InputLabel id="group-for-permissions-label">Group</InputLabel>
              <Select
                labelId="group-for-permissions-label"
                label="Group"
                value={permissionForm.group_id}
                onChange={(event) =>
                  setPermissionForm((prev) => ({ ...prev, group_id: event.target.value }))
                }
              >
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={CYBER_GROUP_FIELD_SX}>
              <InputLabel id="permission-client-label">Client</InputLabel>
              <Select
                labelId="permission-client-label"
                label="Client"
                value={permissionForm.client_id}
                onChange={(event) =>
                  setPermissionForm((prev) => ({
                    ...prev,
                    client_id: event.target.value,
                    permission_codes: [],
                  }))
                }
              >
                {permissionClientIds.map((clientId) => (
                  <MenuItem key={clientId} value={clientId}>
                    {clientId}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={CYBER_GROUP_FIELD_SX}>
              <InputLabel id="permissions-multi-label">Permissions</InputLabel>
              <Select
                labelId="permissions-multi-label"
                multiple
                value={permissionForm.permission_codes}
                label="Permissions"
                onChange={(event) => {
                  const value = event.target.value;
                  setPermissionForm((prev) => ({
                    ...prev,
                    permission_codes: Array.isArray(value) ? value : [],
                  }));
                }}
              >
                {filteredPermissions.map((permission) => (
                  <MenuItem key={permission.id} value={permission.code}>
                    {permission.code}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button type="submit" variant="contained" disabled={isSubmitting} sx={CYBER_PRIMARY_BUTTON_SX}>
              Assign
            </Button>
          </Stack>
        </Box>
      </Card>

      {canManageDeploymentResourcePermissions ? (
        <Card variant="outlined" sx={CYBER_ACTION_CARD_SX}>
          <Box sx={{ mb: 1.75 }}>
            <Typography variant="h6" sx={CYBER_ACTION_CARD_TITLE_SX}>
              Assign Deployment Resource Permissions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage per-deployment permission codes for the selected group.
            </Typography>
            <Box sx={CYBER_DIVIDER_SX} />
          </Box>
          <Box component="form" onSubmit={onAssignDeploymentsToGroup}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <FormControl fullWidth sx={CYBER_GROUP_FIELD_SX}>
                <InputLabel id="group-for-deployments-label">Group</InputLabel>
                <Select
                  labelId="group-for-deployments-label"
                  label="Group"
                  value={groupDeploymentForm.group_id}
                  onChange={(event) => {
                    const nextGroupId = event.target.value;
                    const assignmentMap = groupDeploymentPermissionsMap[nextGroupId] || {};
                    const deploymentIds = Object.keys(assignmentMap).sort();
                    const permissionCodes = Array.from(
                      new Set(
                        Object.values(assignmentMap).flatMap((value) => (Array.isArray(value) ? value : []))
                      )
                    ).sort();
                    setGroupDeploymentForm({
                      group_id: nextGroupId,
                      deployment_ids: deploymentIds,
                      permission_codes: permissionCodes.length
                        ? permissionCodes
                        : defaultDeploymentPermissionCodes,
                    });
                  }}
                >
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={CYBER_GROUP_FIELD_SX}>
                <InputLabel id="deployment-permissions-multi-label">Resource Permissions</InputLabel>
                <Select
                  labelId="deployment-permissions-multi-label"
                  multiple
                  value={groupDeploymentForm.permission_codes}
                  label="Resource Permissions"
                  onChange={(event) => {
                    const value = event.target.value;
                    setGroupDeploymentForm((prev) => ({
                      ...prev,
                      permission_codes: Array.isArray(value) ? value : [],
                    }));
                  }}
                  renderValue={(selected) =>
                    (Array.isArray(selected) ? selected : []).join(', ')
                  }
                >
                  {deploymentPermissionOptions.map((permissionOption) => (
                    <MenuItem key={permissionOption.value} value={permissionOption.value}>
                      {permissionOption.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={CYBER_GROUP_FIELD_SX}>
                <InputLabel id="deployments-multi-label">Deployments</InputLabel>
                <Select
                  labelId="deployments-multi-label"
                  multiple
                  value={groupDeploymentForm.deployment_ids}
                  label="Deployments"
                  onChange={(event) => {
                    const value = event.target.value;
                    setGroupDeploymentForm((prev) => ({
                      ...prev,
                      deployment_ids: Array.isArray(value) ? value : [],
                    }));
                  }}
                  renderValue={(selected) =>
                    (Array.isArray(selected) ? selected : [])
                      .map((deploymentId) => deploymentLabelById[deploymentId] || deploymentId)
                      .join(', ')
                  }
                >
                  {prefectDeployments.map((deployment) => (
                    <MenuItem key={deployment.id} value={deployment.id}>
                      {deployment.name || deployment.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button type="submit" variant="contained" disabled={isSubmitting} sx={CYBER_PRIMARY_BUTTON_SX}>
                Assign
              </Button>
            </Stack>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Box
              sx={{
                height: 1,
                background: 'linear-gradient(90deg, rgba(var(--brand-blue-rgb), 0.45), rgba(143,42,163,0.20), transparent)',
                mb: 1.25,
              }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Currently assigned to selected group
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {selectedGroupDeploymentIds.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No deployments assigned.
                </Typography>
              ) : (
                selectedGroupDeploymentIds.map((deploymentId) => (
                  <Chip
                    key={deploymentId}
                    label={`${deploymentLabelById[deploymentId] || deploymentId} (${(selectedGroupDeploymentAssignments[deploymentId] || []).join(', ')})`}
                    onDelete={() =>
                      onRemoveDeploymentFromGroup(groupDeploymentForm.group_id, deploymentId)
                    }
                    disabled={isSubmitting}
                    sx={{ mb: 1, ...CYBER_ASSIGNMENT_CHIP_SX }}
                  />
                ))
              )}
            </Stack>
          </Box>
        </Card>
      ) : null}

      {isSuperuser ? (
        <DashboardTooltipIconButton
          title="create group"
          ariaLabel="create group"
          onClick={onOpenCreateGroupDialog}
          disabled={isSubmitting}
        >
          <AddIcon />
        </DashboardTooltipIconButton>
      ) : null}

      <Card
        variant="outlined"
        sx={(theme) => ({
          ...theme.customStyles.dashboard.dataGrid.card,
          width: '100%',
          height: 440,
        })}
      >
        <DataGrid
          rows={groups}
          columns={groupColumns}
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
  );
}
