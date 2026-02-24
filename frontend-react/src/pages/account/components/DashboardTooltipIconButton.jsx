import { Box, IconButton, Tooltip } from '@mui/material';

const DEFAULT_CONTAINER_SX = {
  display: 'flex',
  justifyContent: 'flex-end',
};

const DEFAULT_BUTTON_SX = {
  color: 'cyberAqua.main',
  border: '1px solid rgba(0, 203, 221, 0.45)',
  background: 'linear-gradient(135deg, rgba(0, 203, 221, 0.2), rgba(143, 42, 163, 0.15))',
  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.4)',
  '&:hover': {
    color: 'cyberAqua.main',
    borderColor: 'rgba(0, 203, 221, 0.7)',
    background: 'linear-gradient(135deg, rgba(0, 203, 221, 0.32), rgba(143, 42, 163, 0.24))',
  },
};

export default function DashboardTooltipIconButton({
  title,
  ariaLabel,
  onClick,
  disabled = false,
  children,
  containerSx,
  buttonSx,
}) {
  return (
    <Box sx={{ ...DEFAULT_CONTAINER_SX, ...containerSx }}>
      <Tooltip title={title}>
        <span>
          <IconButton
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
            sx={{ ...DEFAULT_BUTTON_SX, ...buttonSx }}
          >
            {children}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
