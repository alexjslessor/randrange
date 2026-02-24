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
  deploymentIds: [],
  permissionCodes: [],
};
const createEmptyRowSelectionModel = () => ({
  type: 'include',
  ids: new Set(),
});

const normalizePermissionCodes = (permissionCodes) =>
  Array.from(
    new Set((Array.isArray(permissionCodes) ? permissionCodes : []).filter(Boolean))
  ).sort();

const areSetsEqual = (leftSet, rightSet) => {
  if (leftSet.size !== rightSet.size) return false;
  for (const value of leftSet) {
    if (!rightSet.has(value)) return false;
  }
  return true;
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
  const [rowSelectionModel, setRowSelectionModel] = useState(createEmptyRowSelectionModel);

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
    setRowSelectionModel(createEmptyRowSelectionModel());
  }, [open]);

  useEffect(() => {
    const availableDeploymentIds = new Set(
      deploymentRows.map((deploymentRow) => String(deploymentRow.id))
    );

    setRowSelectionModel((prev) => {
      const nextIds = new Set(
        Array.from(prev.ids || [])
          .map((deploymentId) => String(deploymentId))
          .filter((deploymentId) => availableDeploymentIds.has(deploymentId))
      );
      if (areSetsEqual(nextIds, prev.ids || new Set())) {
        return prev;
      }
      return {
        ...prev,
        ids: nextIds,
      };
    });
  }, [deploymentRows]);

  const selectedDeploymentIds = useMemo(() => {
    if (!rowSelectionModel) return [];
    if (rowSelectionModel.type === 'exclude') {
      const excludedIds = new Set(
        Array.from(rowSelectionModel.ids || []).map((deploymentId) => String(deploymentId))
      );
      return deploymentRows
        .map((deploymentRow) => String(deploymentRow.id))
        .filter((deploymentId) => !excludedIds.has(deploymentId));
    }
    return Array.from(rowSelectionModel.ids || [])
      .map((deploymentId) => String(deploymentId))
      .filter(Boolean);
  }, [deploymentRows, rowSelectionModel]);

  const handleOpenPermissionDialog = (deploymentIdsOrId) => {
    const deploymentIds = Array.isArray(deploymentIdsOrId)
      ? deploymentIdsOrId
      : [deploymentIdsOrId];
    const normalizedDeploymentIds = Array.from(
      new Set(
        deploymentIds
          .map((deploymentId) => String(deploymentId || '').trim())
          .filter(Boolean)
      )
    );
    if (normalizedDeploymentIds.length === 0) return;

    const assignedPermissionCodeSets = normalizedDeploymentIds.map((deploymentId) =>
      normalizePermissionCodes(userAssignments[deploymentId])
    );
    const firstPermissionCodes = assignedPermissionCodeSets[0] || [];
    const isUniformAssignment = assignedPermissionCodeSets.every(
      (permissionCodes) => permissionCodes.join('|') === firstPermissionCodes.join('|')
    );
    const hasExistingAssignments = assignedPermissionCodeSets.some(
      (permissionCodes) => permissionCodes.length > 0
    );

    setPermissionDialogState({
      open: true,
      deploymentIds: normalizedDeploymentIds,
      permissionCodes: isUniformAssignment && hasExistingAssignments
        ? firstPermissionCodes
        : normalizePermissionCodes(defaultDeploymentPermissionCodes),
    });
  };

  const handleClosePermissionDialog = () => {
    if (isSubmitting) return;
    setPermissionDialogState(emptyPermissionDialogState);
  };

  const handleSavePermissions = async () => {
    if (!selectedUserId || permissionDialogState.deploymentIds.length === 0) return;
    const shouldClose = await onSaveDeploymentPermissions?.({
      userId: selectedUserId,
      deploymentId: permissionDialogState.deploymentIds[0] || '',
      deploymentIds: permissionDialogState.deploymentIds,
      permissionCodes: permissionDialogState.permissionCodes,
    });
    if (shouldClose !== false) {
      setPermissionDialogState(emptyPermissionDialogState);
    }
  };

  const permissionDialogDeploymentLabels = useMemo(() => {
    const deploymentIds = Array.isArray(permissionDialogState.deploymentIds)
      ? permissionDialogState.deploymentIds
      : [];
    return deploymentIds.map((deploymentId) =>
      deploymentLabelById[deploymentId] || deploymentId
    );
  }, [deploymentLabelById, permissionDialogState.deploymentIds]);

  const permissionDialogSubtitle = useMemo(() => {
    if (permissionDialogDeploymentLabels.length === 0) return '';
    if (permissionDialogDeploymentLabels.length === 1) {
      return permissionDialogDeploymentLabels[0];
    }
    return `${permissionDialogDeploymentLabels.length} deployments selected`;
  }, [permissionDialogDeploymentLabels]);

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
        sortable: true,
        filterable: false,
        valueGetter: (_value, row) => {
          const permissionCodes = Array.isArray(row?.permission_codes)
            ? row.permission_codes
            : [];
          return permissionCodes.length ? permissionCodes.join(', ') : '';
        },
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
            description="Use the table checkboxes to select deployments, then bulk-assign permissions to all selected rows."
          >
            <Typography variant="caption" color="text.secondary">
              Realm: {user?.realm_id || 'n/a'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              User ID: {selectedUserId || 'n/a'}
            </Typography>
          </DashboardDialogHeroCard>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
          >
            <Typography variant="body2" color="text.secondary">
              Selected deployments: {selectedDeploymentIds.length}
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<PlaylistAddCheckCircleOutlinedIcon />}
              disabled={isSubmitting || selectedDeploymentIds.length === 0}
              onClick={() => handleOpenPermissionDialog(selectedDeploymentIds)}
              sx={(theme) => theme.customStyles.dashboard.dialog.accentSubmitButton}
            >
              Assign Permissions to Selected
            </Button>
          </Stack>

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
              checkboxSelection
              rowSelectionModel={rowSelectionModel}
              onRowSelectionModelChange={(nextRowSelectionModel) => {
                setRowSelectionModel(nextRowSelectionModel);
              }}
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
        subtitle={permissionDialogSubtitle}
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
              disabled={isSubmitting || permissionDialogState.deploymentIds.length === 0}
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
          {permissionDialogState.deploymentIds.length > 1 ? (
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
                Applying to {permissionDialogState.deploymentIds.length} deployments:
                {' '}
                {permissionDialogDeploymentLabels.slice(0, 4).join(', ')}
                {permissionDialogDeploymentLabels.length > 4
                  ? ` (+${permissionDialogDeploymentLabels.length - 4} more)`
                  : ''}
              </Typography>
            </Box>
          ) : null}
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
              Select one or more permissions. Leave empty and save to remove all permissions for the selected deployment(s).
            </Typography>
          </Box>
        </Stack>
      </BaseDialog>
    </>
  );
}
