import {
  Box,
  Button,
  Card,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

export default function DashboardUserDeploymentPermissionsCard({
  isSubmitting,
  users,
  userDeploymentForm,
  setUserDeploymentForm,
  userDeploymentPermissionsMap,
  deploymentPermissionOptions,
  defaultDeploymentPermissionCodes,
  prefectDeployments,
  deploymentLabelById,
  selectedUserDeploymentIds,
  selectedUserDeploymentAssignments,
  onAssignDeploymentsToUser,
  onRemoveDeploymentFromUser,
}) {
  const theme = useTheme();
  const assignedChipSx = {
    backgroundColor: theme.palette.cyberAqua.main,
    color: '#fff',
    '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)' },
  };
  const assignedListChipSx = { ...assignedChipSx, mb: 1 };
  const stopSelectToggle = (event) => {
    event.stopPropagation();
  };
  const removeValueFromMultiSelect = (fieldName, valueToRemove) => {
    setUserDeploymentForm((prev) => ({
      ...prev,
      [fieldName]: (Array.isArray(prev[fieldName]) ? prev[fieldName] : [])
        .filter((value) => value !== valueToRemove),
    }));
  };
  const deploymentSelectMenuProps = {
    PaperProps: {
      sx: {
        maxHeight: '50vh',
        overflowY: 'auto',
      },
    },
  };
  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        ...theme.customStyles.dashboard.dialog.sectionCard,
      })}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6">Assign Deployment Permissions to User</Typography>
        <Typography variant="body2" color="text.secondary">
          Grant per-deployment permission codes directly to a specific user.
        </Typography>
      </Box>

      <Box component="form" onSubmit={onAssignDeploymentsToUser}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <FormControl fullWidth sx={(theme) => theme.customStyles.dashboard.dialog.field}>
            <InputLabel id="user-for-deployments-label">User</InputLabel>
            <Select
              labelId="user-for-deployments-label"
              label="User"
              value={userDeploymentForm.user_id}
              onChange={(event) => {
                const nextUserId = event.target.value;
                const assignmentMap = userDeploymentPermissionsMap[nextUserId] || {};
                const deploymentIds = Object.keys(assignmentMap).sort();
                const permissionCodes = Array.from(
                  new Set(
                    Object.values(assignmentMap).flatMap((value) => (Array.isArray(value) ? value : []))
                  )
                ).sort();
                setUserDeploymentForm({
                  user_id: nextUserId,
                  deployment_ids: deploymentIds,
                  permission_codes: permissionCodes.length
                    ? permissionCodes
                    : defaultDeploymentPermissionCodes,
                });
              }}
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={(theme) => theme.customStyles.dashboard.dialog.field}>
            <InputLabel id="user-deployment-permissions-multi-label">Resource Permissions</InputLabel>
            <Select
              labelId="user-deployment-permissions-multi-label"
              multiple
              value={userDeploymentForm.permission_codes}
              label="Resource Permissions"
              onChange={(event) => {
                const value = event.target.value;
                setUserDeploymentForm((prev) => ({
                  ...prev,
                  permission_codes: Array.isArray(value) ? value : [],
                }));
              }}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(Array.isArray(selected) ? selected : []).map((permissionCode) => (
                    <Chip
                      key={permissionCode}
                      label={permissionCode}
                      size="small"
                      onMouseDown={stopSelectToggle}
                      onDelete={() => removeValueFromMultiSelect('permission_codes', permissionCode)}
                    />
                  ))}
                </Box>
              )}
            >
              {deploymentPermissionOptions.map((permissionOption) => (
                <MenuItem key={permissionOption.value} value={permissionOption.value}>
                  {permissionOption.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={(theme) => theme.customStyles.dashboard.dialog.field}>
            <InputLabel id="user-deployments-multi-label">Deployments</InputLabel>
            <Select
              labelId="user-deployments-multi-label"
              multiple
              value={userDeploymentForm.deployment_ids}
              label="Deployments"
              MenuProps={deploymentSelectMenuProps}
              onChange={(event) => {
                const value = event.target.value;
                setUserDeploymentForm((prev) => ({
                  ...prev,
                  deployment_ids: Array.isArray(value) ? value : [],
                }));
              }}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(Array.isArray(selected) ? selected : []).map((deploymentId) => (
                    <Chip
                      key={deploymentId}
                      label={deploymentLabelById[deploymentId] || deploymentId}
                      size="small"
                      onMouseDown={stopSelectToggle}
                      onDelete={() => removeValueFromMultiSelect('deployment_ids', deploymentId)}
                      sx={selectedUserDeploymentIds.includes(deploymentId) ? assignedChipSx : {}}
                    />
                  ))}
                </Box>
              )}
            >
              {prefectDeployments.map((deployment) => (
                <MenuItem key={deployment.id} value={deployment.id}>
                  {deployment.name || deployment.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button type="submit" variant="contained" disabled={isSubmitting}>
            Assign
          </Button>
        </Stack>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Currently assigned to selected user
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          {selectedUserDeploymentIds.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No deployments assigned.
            </Typography>
          ) : (
            selectedUserDeploymentIds.map((deploymentId) => (
              <Chip
                key={deploymentId}
                label={`${deploymentLabelById[deploymentId] || deploymentId} (${(selectedUserDeploymentAssignments[deploymentId] || []).join(', ')})`}
                onDelete={() =>
                  onRemoveDeploymentFromUser(userDeploymentForm.user_id, deploymentId)
                }
                disabled={isSubmitting}
                sx={assignedListChipSx}
              />
            ))
          )}
        </Stack>
      </Box>
    </Card>
  );
}
