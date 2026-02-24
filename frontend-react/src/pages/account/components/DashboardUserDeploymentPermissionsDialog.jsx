import { useEffect, useMemo, useState } from 'react';
import PlaylistAddCheckCircleOutlinedIcon from '@mui/icons-material/PlaylistAddCheckCircleOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import {
  Box,
  Button,
  Card,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import BaseDialog from '@/components/BaseDialog';
import DashboardDialogHeroCard from '@/pages/account/components/DashboardDialogHeroCard';

const CLOSE_BUTTON_SX = {
  borderRadius: 999,
  px: 2.2,
};

const ASSIGN_ICON_BUTTON_SX = {
  color: 'cyberAqua.main',
  border: '1px solid rgba(0, 203, 221, 0.42)',
  background: 'linear-gradient(140deg, rgba(0, 203, 221, 0.2), rgba(143, 42, 163, 0.16))',
  '&:hover': {
    borderColor: 'rgba(0, 203, 221, 0.68)',
    background: 'linear-gradient(140deg, rgba(0, 203, 221, 0.33), rgba(143, 42, 163, 0.22))',
  },
};

const PERMISSION_MENU_PROPS = {
  PaperProps: {
    sx: {
      maxHeight: '42vh',
    },
  },
};

const emptyPermissionDialogState = {
  open: false,
  deploymentId: '',
  permissionCodes: [],
};

export default function DashboardUserDeploymentPermissionsDialog({
  open,
  onClose,
  isSubmitting,
  user,
  prefectDeployments,
  deploymentLabelById,
  userDeploymentPermissionsMap,
  deploymentPermissionOptions,
  defaultDeploymentPermissionCodes,
  onSaveDeploymentPermissions,
}) {
  const [permissionDialogState, setPermissionDialogState] = useState(emptyPermissionDialogState);

  const selectedUserId = user?.id || '';
  const userAssignments = useMemo(
    () => (selectedUserId ? (userDeploymentPermissionsMap[selectedUserId] || {}) : {}),
    [selectedUserId, userDeploymentPermissionsMap]
  );

  const deploymentRows = useMemo(() => {
    const deploymentIds = Array.from(
      new Set([
        ...(Array.isArray(prefectDeployments)
          ? prefectDeployments.map((deployment) => String(deployment?.id || '')).filter(Boolean)
          : []),
        ...Object.keys(userAssignments || {}),
      ])
    );

    deploymentIds.sort((leftId, rightId) => {
      const leftLabel = String(deploymentLabelById[leftId] || leftId).toLowerCase();
      const rightLabel = String(deploymentLabelById[rightId] || rightId).toLowerCase();
      return leftLabel.localeCompare(rightLabel);
    });

    return deploymentIds.map((deploymentId) => ({
      id: deploymentId,
      deployment_name: deploymentLabelById[deploymentId] || deploymentId,
      permission_codes: Array.isArray(userAssignments[deploymentId])
        ? userAssignments[deploymentId]
        : [],
    }));
  }, [deploymentLabelById, prefectDeployments, userAssignments]);

  useEffect(() => {
    if (open) return;
    setPermissionDialogState(emptyPermissionDialogState);
  }, [open]);

  const handleOpenPermissionDialog = (deploymentId) => {
    const assignedPermissionCodes = Array.isArray(userAssignments[deploymentId])
      ? userAssignments[deploymentId]
      : [];
    setPermissionDialogState({
      open: true,
      deploymentId,
      permissionCodes: assignedPermissionCodes.length
        ? [...assignedPermissionCodes]
        : [...defaultDeploymentPermissionCodes],
    });
  };

  const handleClosePermissionDialog = () => {
    if (isSubmitting) return;
    setPermissionDialogState(emptyPermissionDialogState);
  };

  const handleSavePermissions = async () => {
    if (!selectedUserId || !permissionDialogState.deploymentId) return;
    const shouldClose = await onSaveDeploymentPermissions?.({
      userId: selectedUserId,
      deploymentId: permissionDialogState.deploymentId,
      permissionCodes: permissionDialogState.permissionCodes,
    });
    if (shouldClose !== false) {
      setPermissionDialogState(emptyPermissionDialogState);
    }
  };

  const deploymentColumns = useMemo(
    () => [
      {
        field: 'deployment_name',
        headerName: 'Deployment Name',
        flex: 1,
        minWidth: 260,
      },
      {
        field: 'permissions',
        headerName: 'Permissions',
        flex: 1,
        minWidth: 280,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const permissionCodes = Array.isArray(params.row?.permission_codes)
            ? params.row.permission_codes
            : [];
          return (
            <Typography variant="body2" color={permissionCodes.length ? 'text.primary' : 'text.secondary'}>
              {permissionCodes.length ? permissionCodes.join(', ') : 'No permissions assigned'}
            </Typography>
          );
        },
      },
      {
        field: 'assign',
        headerName: 'Assign',
        width: 110,
        sortable: false,
        filterable: false,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
          <Tooltip title={params.row?.permission_codes?.length ? 'Edit permissions' : 'Assign permissions'}>
            <span>
              <IconButton
                size="small"
                aria-label="Assign deployment permissions"
                disabled={isSubmitting}
                onClick={(event) => {
                  event.stopPropagation();
                  handleOpenPermissionDialog(params.row.id);
                }}
                sx={ASSIGN_ICON_BUTTON_SX}
              >
                <PlaylistAddCheckCircleOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        ),
      },
    ],
    [isSubmitting]
  );

  return (
    <>
      <BaseDialog
        open={open}
        onClose={onClose}
        isSubmitting={isSubmitting}
        maxWidth="lg"
        icon={SecurityOutlinedIcon}
        title="Assign Deployment Permissions to User"
        subtitle="Review and configure deployment-level access for this user"
        actions={(
          <Button
            variant="outlined"
            color="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            sx={CLOSE_BUTTON_SX}
          >
            Close
          </Button>
        )}
      >
        <Stack spacing={2} sx={{mt: 2}}>
          <DashboardDialogHeroCard
            overline="User Access"
            title={user?.username || 'User'}
            description="Each deployment row shows current permissions. Use Assign to add or replace permissions."
          >
            <Typography variant="caption" color="text.secondary">
              Realm: {user?.realm_id || 'n/a'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              User ID: {selectedUserId || 'n/a'}
            </Typography>
          </DashboardDialogHeroCard>

          <Card
            variant="outlined"
            sx={(theme) => ({
              ...theme.customStyles.dashboard.dataGrid.card,
              width: '100%',
              height: 420,
            })}
          >
            <DataGrid
              rows={deploymentRows}
              columns={deploymentColumns}
              getRowId={(row) => row.id}
              disableRowSelectionOnClick
              hideFooter
              sx={(theme) => ({
                ...theme.customStyles.dashboard.dataGrid.grid,
                '& .MuiDataGrid-cell': {
                  alignItems: 'center',
                },
              })}
              localeText={{
                noRowsLabel: 'No deployments available.',
              }}
            />
          </Card>
        </Stack>
      </BaseDialog>

      <BaseDialog
        open={permissionDialogState.open}
        onClose={handleClosePermissionDialog}
        isSubmitting={isSubmitting}
        maxWidth="sm"
        icon={TuneOutlinedIcon}
        title="Select Permissions"
        subtitle={deploymentLabelById[permissionDialogState.deploymentId] || permissionDialogState.deploymentId}
        actions={(
          <>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleClosePermissionDialog}
              disabled={isSubmitting}
              sx={CLOSE_BUTTON_SX}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSavePermissions}
              disabled={isSubmitting || !permissionDialogState.deploymentId}
              sx={(theme) => theme.customStyles.dashboard.dialog.accentSubmitButton}
            >
              Save Permissions
            </Button>
          </>
        )}
      >
        <Stack spacing={1.6} sx={{mt: 3}}>
          <FormControl fullWidth sx={(theme) => theme.customStyles.dashboard.dialog.field}>
            <InputLabel id="user-deployment-dialog-permission-label">Permissions</InputLabel>
            <Select
              labelId="user-deployment-dialog-permission-label"
              label="Permissions"
              multiple
              value={permissionDialogState.permissionCodes}
              MenuProps={PERMISSION_MENU_PROPS}
              renderValue={(selected) => {
                const values = Array.isArray(selected) ? selected : [];
                return values.length > 0 ? values.join(', ') : 'No permissions selected';
              }}
              onChange={(event) => {
                const nextValue = event.target.value;
                setPermissionDialogState((prev) => ({
                  ...prev,
                  permissionCodes: Array.isArray(nextValue) ? nextValue : [],
                }));
              }}
            >
              {deploymentPermissionOptions.map((permissionOption) => (
                <MenuItem key={permissionOption.value} value={permissionOption.value}>
                  {permissionOption.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box
            sx={{
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 1.5,
              px: 1.2,
              py: 0.9,
              backgroundColor: 'rgba(255,255,255,0.03)',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Select one or more permissions. Leave empty and save to remove all permissions for this deployment.
            </Typography>
          </Box>
        </Stack>
      </BaseDialog>
    </>
  );
}
