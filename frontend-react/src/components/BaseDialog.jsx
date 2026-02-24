import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useTheme } from '@mui/material/styles';

export default function BaseDialog({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  actions,
  isSubmitting = false,
  maxWidth = 'sm',
}) {
  const theme = useTheme();
  const dialogStyles = theme.customStyles.dashboard.dialog;

  const handleDialogClose = (event, reason) => {
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      return;
    }
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : handleDialogClose}
      disableEscapeKeyDown
      maxWidth={maxWidth}
      fullWidth
      PaperProps={{
        sx: dialogStyles.paper,
      }}
    >
      <DialogTitle sx={dialogStyles.title}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1, minWidth: 0 }}>
            {Icon && <Icon sx={{ color: 'cyberAqua.main' }} />}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          <Tooltip title="Close">
            <span>
              <IconButton
                size="small"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label={`Close ${title} dialog`}
                sx={{
                  color: 'text.secondary',
                  border: '1px solid rgba(255,255,255,0.16)',
                  '&:hover': {
                    color: 'text.primary',
                    borderColor: 'rgba(0,203,221,0.65)',
                    backgroundColor: 'rgba(0,203,221,0.08)',
                  },
                }}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </DialogTitle>
      <DialogContent sx={dialogStyles.content}>
        {children}
      </DialogContent>
      {actions && (
        <DialogActions sx={dialogStyles.actions}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}
