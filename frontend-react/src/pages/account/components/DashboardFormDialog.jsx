import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';

const DIALOG_PAPER_SX = {
  borderRadius: 3,
  border: '1px solid rgba(0, 203, 221, 0.35)',
  background: 'linear-gradient(170deg, rgba(15,22,28,0.98), rgba(9,12,16,0.99))',
  boxShadow: '0 24px 56px rgba(0, 0, 0, 0.62)',
  overflow: 'hidden',
};

const DIALOG_TITLE_SX = {
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  background: 'linear-gradient(120deg, rgba(0, 203, 221, 0.2), rgba(143, 42, 163, 0.18))',
  px: 2,
  py: 1.5,
};

const DIALOG_CONTENT_SX = {
  p: { xs: 2, sm: 2.5 },
  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  backgroundColor: 'rgba(255, 255, 255, 0.015)',
};

const DIALOG_ACTIONS_SX = {
  px: { xs: 2, sm: 2.5 },
  pb: { xs: 2, sm: 2.5 },
  pt: 0,
};

const DIALOG_CLOSE_ICON_BUTTON_SX = {
  color: 'text.secondary',
  border: '1px solid rgba(255,255,255,0.16)',
  '&:hover': {
    color: 'text.primary',
    borderColor: 'rgba(0,203,221,0.65)',
    backgroundColor: 'rgba(0,203,221,0.08)',
  },
};

const DIALOG_SUBMIT_BUTTON_SX = {
  borderRadius: 999,
  px: 2.4,
  background: 'linear-gradient(120deg, rgba(0,203,221,0.85), rgba(143,42,163,0.8))',
  '&:hover': {
    background: 'linear-gradient(120deg, rgba(0,203,221,1), rgba(143,42,163,0.95))',
  },
};

export default function DashboardFormDialog({
  open,
  onClose,
  onRequestClose,
  onSubmit,
  isSubmitting = false,
  autoComplete,
  title,
  subtitle,
  titleIcon,
  closeAriaLabel,
  submitLabel,
  submittingLabel,
  submitIcon,
  submitDisabled = false,
  children,
}) {
  return (
    <Dialog
      open={open}
      onClose={onRequestClose}
      disableEscapeKeyDown
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: DIALOG_PAPER_SX,
      }}
    >
      <Box component="form" onSubmit={onSubmit} autoComplete={autoComplete}>
        <DialogTitle sx={DIALOG_TITLE_SX}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1, minWidth: 0 }}>
              {titleIcon}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
                  {title}
                </Typography>
                {subtitle ? (
                  <Typography variant="caption" color="text.secondary">
                    {subtitle}
                  </Typography>
                ) : null}
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={onClose}
              aria-label={closeAriaLabel}
              disabled={isSubmitting}
              sx={DIALOG_CLOSE_ICON_BUTTON_SX}
            >
              <CloseOutlinedIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={DIALOG_CONTENT_SX}>{children}</DialogContent>

        <DialogActions sx={DIALOG_ACTIONS_SX}>
          <Button
            onClick={onClose}
            disabled={isSubmitting}
            variant="outlined"
            color="secondary"
            startIcon={<CloseOutlinedIcon />}
            sx={{ borderRadius: 999, px: 2 }}
          >
            Close
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || submitDisabled}
            startIcon={submitIcon}
            sx={DIALOG_SUBMIT_BUTTON_SX}
          >
            {isSubmitting ? submittingLabel : submitLabel}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
