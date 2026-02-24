import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import DashboardDialogHeroCard from '@/pages/account/components/DashboardDialogHeroCard';
import DashboardDialogSectionCard from '@/pages/account/components/DashboardDialogSectionCard';
import DashboardFormDialog from '@/pages/account/components/DashboardFormDialog';

export default function DashboardCreateUserDialog({
  open,
  onClose,
  onRequestClose,
  onSubmit,
  isSubmitting,
  isSuperuser,
  newUserForm,
  setNewUserForm,
  selectedCreateUserGroup,
  groups,
  realms,
}) {
  return (
    <DashboardFormDialog
      open={open}
      onClose={onClose}
      onRequestClose={onRequestClose}
      onSubmit={onSubmit}
      autoComplete="off"
      isSubmitting={isSubmitting}
      title="Create User"
      subtitle="Provision account and initial access"
      titleIcon={<AddIcon sx={{ color: 'cyberAqua.main' }} />}
      closeAriaLabel="Close create user dialog"
      submitLabel="Create User"
      submittingLabel="Creating..."
      submitIcon={<AddIcon />}
    >
      <input
        type="text"
        name="create-user-fake-username"
        autoComplete="username"
        style={{ display: 'none' }}
        tabIndex={-1}
      />
      <input
        type="password"
        name="create-user-fake-password"
        autoComplete="new-password"
        style={{ display: 'none' }}
        tabIndex={-1}
      />

      <Stack spacing={2.1} sx={{ mt: 1 }}>
        <DashboardDialogHeroCard
          overline="User Setup"
          title={newUserForm.username?.trim() || 'New Account'}
          description="Create credentials and assign default group access. Permissions can be expanded from the Groups tab."
        >
          <Chip
            size="small"
            variant="outlined"
            sx={{
              borderColor: 'rgba(0,203,221,0.5)',
              color: 'cyberAqua.main',
            }}
            label={newUserForm.group_id ? 'Group linked' : 'No group selected'}
          />
        </DashboardDialogHeroCard>

        <DashboardDialogSectionCard
          title="Credentials"
          description="Set the username and initial password."
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
              name="create-user-username"
              autoComplete="new-username"
              value={newUserForm.username}
              onChange={(event) =>
                setNewUserForm((prev) => ({ ...prev, username: event.target.value }))
              }
              fullWidth
              sx={(theme) => theme.customStyles.dashboard.dialog.field}
            />
            <TextField
              label="Password"
              type="password"
              name="create-user-password"
              autoComplete="new-password"
              value={newUserForm.password}
              onChange={(event) =>
                setNewUserForm((prev) => ({ ...prev, password: event.target.value }))
              }
              fullWidth
              sx={(theme) => theme.customStyles.dashboard.dialog.field}
            />
          </Box>
        </DashboardDialogSectionCard>

        <DashboardDialogSectionCard
          title="Access Assignment"
          description="Choose realm, group, and role scope for this account."
        >
          <Stack spacing={1.5}>
            {isSuperuser ? (
              <FormControl fullWidth sx={(theme) => theme.customStyles.dashboard.dialog.field}>
                <InputLabel id="realm-select-user-label">Realm</InputLabel>
                <Select
                  labelId="realm-select-user-label"
                  label="Realm"
                  value={newUserForm.realm_id}
                  onChange={(event) =>
                    setNewUserForm((prev) => ({ ...prev, realm_id: event.target.value }))
                  }
                >
                  {realms
                    .filter((realm) => realm.slug !== 'master')
                    .map((realm) => (
                      <MenuItem key={realm.id} value={realm.id}>
                        {realm.slug}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                label="Realm"
                value={selectedCreateUserGroup?.realm_id || newUserForm.realm_id}
                fullWidth
                disabled
                sx={(theme) => theme.customStyles.dashboard.dialog.field}
              />
            )}

            <FormControl fullWidth sx={(theme) => theme.customStyles.dashboard.dialog.field}>
              <InputLabel id="group-for-user-create-label">Group</InputLabel>
              <Select
                labelId="group-for-user-create-label"
                label="Group"
                value={newUserForm.group_id}
                onChange={(event) =>
                  setNewUserForm((prev) => ({
                    ...prev,
                    group_id: event.target.value,
                  }))
                }
              >
                {isSuperuser ? <MenuItem value="">No group</MenuItem> : null}
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
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
              <FormControlLabel
                control={(
                  <Checkbox
                    checked={newUserForm.group_is_admin}
                    onChange={(event) =>
                      setNewUserForm((prev) => ({ ...prev, group_is_admin: event.target.checked }))
                    }
                    disabled={!newUserForm.group_id}
                  />
                )}
                label="Group Admin"
              />
            </Box>

            {isSuperuser ? (
              <Box
                sx={{
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: 1.7,
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  px: 1.25,
                  py: 0.8,
                }}
              >
                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={newUserForm.is_superuser}
                      onChange={(event) =>
                        setNewUserForm((prev) => ({ ...prev, is_superuser: event.target.checked }))
                      }
                    />
                  )}
                  label="Superuser"
                />
              </Box>
            ) : null}
          </Stack>
        </DashboardDialogSectionCard>
      </Stack>
    </DashboardFormDialog>
  );
}
