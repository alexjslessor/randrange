import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

export default function DashboardConfirmDeleteDialog({
  open,
  onClose,
  onConfirm,
  isSubmitting = false,
  title,
  entityLabel,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>
          Confirm deletion of {entityLabel}?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="success"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Close
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
