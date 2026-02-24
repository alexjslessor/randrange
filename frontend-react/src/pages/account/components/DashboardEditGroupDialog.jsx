import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Chip,
  Stack,
  TextField,
} from '@mui/material';
import DashboardDialogHeroCard from '@/pages/account/components/DashboardDialogHeroCard';
import DashboardDialogSectionCard from '@/pages/account/components/DashboardDialogSectionCard';
import DashboardFormDialog from '@/pages/account/components/DashboardFormDialog';

export default function DashboardEditGroupDialog({
  open,
  onClose,
  onRequestClose,
  onSubmit,
  isSubmitting,
  editGroupForm,
  setEditGroupForm,
}) {
  return (
    <DashboardFormDialog
      open={open}
      onClose={onClose}
      onRequestClose={onRequestClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      title="Edit Group"
      subtitle="Update group details"
      titleIcon={<EditIcon sx={{ color: 'cyberAqua.main' }} />}
      closeAriaLabel="Close edit group dialog"
      submitLabel="Save Changes"
      submittingLabel="Saving..."
      submitIcon={<EditIcon />}
    >
      <Stack spacing={2.1} sx={{ mt: 1 }}>
        <DashboardDialogHeroCard
          overline="Group Profile"
          title={editGroupForm.name || 'Group'}
          description="Update this group identity and description. Save to apply changes immediately."
        >
          <Chip
            size="small"
            variant="outlined"
            sx={{
              borderColor: 'rgba(0,203,221,0.5)',
              color: 'cyberAqua.main',
            }}
            label={`Realm: ${editGroupForm.realm_id || 'n/a'}`}
          />
        </DashboardDialogHeroCard>

        <DashboardDialogSectionCard
          title="Identity"
          description="Group identifiers are read-only."
        >
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            }}
          >
            <TextField
              label="Group ID"
              value={editGroupForm.id}
              fullWidth
              disabled
              sx={(theme) => theme.customStyles.dashboard.dialog.field}
            />
            <TextField
              label="Realm ID"
              value={editGroupForm.realm_id}
              fullWidth
              disabled
              sx={(theme) => theme.customStyles.dashboard.dialog.field}
            />
          </Box>
        </DashboardDialogSectionCard>

        <DashboardDialogSectionCard
          title="Details"
          description="Maintain a clear name and concise description for admins."
        >
          <Stack spacing={1.5}>
            <TextField
              label="Group name"
              value={editGroupForm.name}
              onChange={(event) =>
                setEditGroupForm((prev) => ({ ...prev, name: event.target.value }))
              }
              fullWidth
              autoFocus
              sx={(theme) => theme.customStyles.dashboard.dialog.field}
            />
            <TextField
              label="Description"
              value={editGroupForm.description}
              onChange={(event) =>
                setEditGroupForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Add a short, human-friendly summary for this group."
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
