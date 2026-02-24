import GroupAddIcon from '@mui/icons-material/GroupAdd';
import {
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import DashboardDialogHeroCard from '@/pages/account/components/DashboardDialogHeroCard';
import DashboardDialogSectionCard from '@/pages/account/components/DashboardDialogSectionCard';
import DashboardFormDialog from '@/pages/account/components/DashboardFormDialog';

export default function DashboardCreateGroupDialog({
  open,
  onClose,
  onRequestClose,
  onSubmit,
  isSubmitting,
  newGroupForm,
  setNewGroupForm,
  realms,
}) {
  return (
    <DashboardFormDialog
      open={open}
      onClose={onClose}
      onRequestClose={onRequestClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      title="Create Group"
      subtitle="Provision a new team group"
      titleIcon={<GroupAddIcon sx={{ color: 'cyberAqua.main' }} />}
      closeAriaLabel="Close create group dialog"
      submitLabel="Create Group"
      submittingLabel="Creating..."
      submitIcon={<GroupAddIcon />}
    >
      <Stack spacing={2.1} sx={{ mt: 1 }}>
        <DashboardDialogHeroCard
          overline="Group Setup"
          title="Identity & Access Group"
          description="Create a new team group and then assign users and permissions in the Groups tab."
        >
          <Chip
            size="small"
            variant="outlined"
            sx={{
              borderColor: 'rgba(0,203,221,0.5)',
              color: 'cyberAqua.main',
            }}
            label="Admin Flow"
          />
        </DashboardDialogHeroCard>

        <DashboardDialogSectionCard
          title="Group Details"
          description="Select realm and add a clear name and purpose description."
        >
          <Stack spacing={1.5}>
            <FormControl fullWidth sx={(theme) => theme.customStyles.dashboard.dialog.field}>
              <InputLabel id="realm-select-group-label">Realm</InputLabel>
              <Select
                labelId="realm-select-group-label"
                label="Realm"
                value={newGroupForm.realm_id}
                onChange={(event) =>
                  setNewGroupForm((prev) => ({ ...prev, realm_id: event.target.value }))
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
              label="Group name"
              value={newGroupForm.name}
              onChange={(event) =>
                setNewGroupForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Platform Operators"
              fullWidth
              sx={(theme) => theme.customStyles.dashboard.dialog.field}
            />
            <TextField
              label="Description"
              value={newGroupForm.description}
              onChange={(event) =>
                setNewGroupForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Who this group is for and what they can manage."
              multiline
              minRows={3}
              fullWidth
              sx={(theme) => theme.customStyles.dashboard.dialog.field}
            />
          </Stack>
        </DashboardDialogSectionCard>
      </Stack>
    </DashboardFormDialog>
  );
}
