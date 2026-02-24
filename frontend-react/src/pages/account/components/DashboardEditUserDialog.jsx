import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Checkbox,
  Chip,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import DashboardDialogHeroCard from '@/pages/account/components/DashboardDialogHeroCard';
import DashboardDialogSectionCard from '@/pages/account/components/DashboardDialogSectionCard';
import DashboardFormDialog from '@/pages/account/components/DashboardFormDialog';

export default function DashboardEditUserDialog({
  open,
  onClose,
  onRequestClose,
  onSubmit,
  isSubmitting,
  isSuperuser,
  editUserForm,
  setEditUserForm,
  editUserSelectedGroupIds,
  groups,
  groupLabelById,
}) {
  return (
    <DashboardFormDialog
      open={open}
      onClose={onClose}
      onRequestClose={onRequestClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      title="Edit User"
      subtitle="Update status and membership"
      titleIcon={<EditIcon sx={{ color: 'cyberAqua.main' }} />}
      closeAriaLabel="Close edit user dialog"
      submitLabel="Save Changes"
      submittingLabel="Saving..."
      submitIcon={<EditIcon />}
      submitDisabled={!isSuperuser && editUserForm.is_superuser}
    >
      <Stack spacing={2.1} sx={{ mt: 1 }}>
        <DashboardDialogHeroCard
          overline="User Profile"
          title={editUserForm.username || 'User'}
          description="Adjust account status and group membership. Click save to apply the updates."
        >
          <Chip
            size="small"
            variant="outlined"
            sx={{
              borderColor: 'rgba(0,203,221,0.5)',
              color: 'cyberAqua.main',
            }}
            label={editUserForm.is_active ? 'Active' : 'Disabled'}
          />
          {editUserForm.is_superuser ? (
            <Chip
              size="small"
              variant="outlined"
              sx={{
                borderColor: 'rgba(255,255,255,0.35)',
                color: 'text.secondary',
              }}
              label="Superuser"
            />
          ) : null}
        </DashboardDialogHeroCard>

        <DashboardDialogSectionCard
          title="Identity"
          description="User identity fields are currently read-only."
        >
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            }}
          >
            <TextField
              label="Username"
              value={editUserForm.username}
              fullWidth
              disabled
              sx={(theme) => theme.customStyles.dashboard.dialog.field}
            />
            <TextField
              label="Realm ID"
              value={editUserForm.realm_id}
              fullWidth
              disabled
              sx={(theme) => theme.customStyles.dashboard.dialog.field}
            />
          </Box>
        </DashboardDialogSectionCard>

        <DashboardDialogSectionCard
          title="Access Controls"
          description="Update account status and manage all group memberships."
        >
          <Stack spacing={1.5}>
            <Box
              sx={{
                border: '1px solid rgba(255, 255, 255, 0.16)',
                borderRadius: 1.7,
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                px: 1.25,
                py: 0.8,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2">Account Enabled</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {editUserForm.is_active
                      ? 'User can sign in and use assigned access.'
                      : 'User is disabled and cannot sign in.'}
                  </Typography>
                </Box>
                <Switch
                  checked={editUserForm.is_active}
                  onChange={(event) =>
                    setEditUserForm((prev) => ({
                      ...prev,
                      is_active: event.target.checked,
                    }))
                  }
                  disabled={isSubmitting || (!isSuperuser && editUserForm.is_superuser)}
                  sx={{
                    '& .MuiSwitch-track': {
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      opacity: 1,
                    },
                    '& .MuiSwitch-thumb': {
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.15)',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: 'cyberAqua.main',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: 'rgba(0,203,221,0.45)',
                      borderColor: 'rgba(0,203,221,0.5)',
                      opacity: 1,
                    },
                  }}
                />
              </Stack>
            </Box>

            <FormControl fullWidth sx={(theme) => theme.customStyles.dashboard.dialog.field}>
              <InputLabel id="edit-user-group-label">Groups</InputLabel>
              <Select
                labelId="edit-user-group-label"
                label="Groups"
                multiple
                value={editUserSelectedGroupIds}
                onChange={(event) =>
                  setEditUserForm((prev) => {
                    const nextValue = event.target.value;
                    const nextGroupIds = Array.isArray(nextValue)
                      ? nextValue
                      : [];
                    const nextGroupIdSet = new Set(nextGroupIds);
                    const nextGroupAdminMap = {};
                    nextGroupIds.forEach((groupId) => {
                      nextGroupAdminMap[groupId] = Boolean(prev.group_admin_map?.[groupId]);
                    });
                    Object.keys(prev.group_admin_map || {}).forEach((groupId) => {
                      if (!nextGroupIdSet.has(groupId)) return;
                      nextGroupAdminMap[groupId] = Boolean(prev.group_admin_map[groupId]);
                    });
                    return {
                      ...prev,
                      group_ids: nextGroupIds,
                      group_admin_map: nextGroupAdminMap,
                    };
                  })
                }
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(Array.isArray(selected) ? selected : []).map((groupId) => (
                      <Chip
                        key={groupId}
                        size="small"
                        label={groupLabelById[groupId] || groupId}
                        onMouseDown={(event) => event.stopPropagation()}
                        onDelete={() =>
                          setEditUserForm((prev) => ({
                            ...prev,
                            group_ids: (Array.isArray(prev.group_ids) ? prev.group_ids : [])
                              .filter((id) => id !== groupId),
                            group_admin_map: Object.fromEntries(
                              Object.entries(prev.group_admin_map || {}).filter(([id]) => id !== groupId)
                            ),
                          }))
                        }
                      />
                    ))}
                  </Box>
                )}
              >
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    <Checkbox
                      checked={editUserSelectedGroupIds.includes(group.id)}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box
              sx={{
                border: '1px solid rgba(255, 255, 255, 0.16)',
                borderRadius: 1.7,
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                px: 1.25,
                py: 0.8,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.8 }}>
                Group Admin Access
              </Typography>
              {editUserSelectedGroupIds.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                  Select one or more groups to configure admin access.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {editUserSelectedGroupIds.map((groupId) => (
                    <ListItem
                      key={groupId}
                      disableGutters
                      secondaryAction={(
                        <Switch
                          size="small"
                          checked={Boolean(editUserForm.group_admin_map?.[groupId])}
                          onChange={(event) =>
                            setEditUserForm((prev) => ({
                              ...prev,
                              group_admin_map: {
                                ...(prev.group_admin_map || {}),
                                [groupId]: event.target.checked,
                              },
                            }))
                          }
                          disabled={isSubmitting}
                          sx={{
                            '& .MuiSwitch-track': {
                              backgroundColor: 'rgba(255,255,255,0.2)',
                              border: '1px solid rgba(255,255,255,0.15)',
                              opacity: 1,
                            },
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: 'cyberAqua.main',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: 'rgba(0,203,221,0.45)',
                              borderColor: 'rgba(0,203,221,0.5)',
                              opacity: 1,
                            },
                          }}
                        />
                      )}
                      sx={{
                        py: 0.4,
                        pr: 0,
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        '&:last-of-type': {
                          borderBottom: 'none',
                        },
                      }}
                    >
                      <ListItemText
                        primary={groupLabelById[groupId] || groupId}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Stack>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1.2, display: 'block' }}
          >
            Remove a membership by clicking the x on a group chip. Changes apply when you click Save.
          </Typography>
        </DashboardDialogSectionCard>
      </Stack>
    </DashboardFormDialog>
  );
}
