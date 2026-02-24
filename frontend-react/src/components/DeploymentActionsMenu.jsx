import { useState } from 'react';
import {
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export default function DeploymentActionsMenu({
  onOpenFte,
  canManageFte = false,
  disabled = false,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const isOpen = Boolean(anchorEl);

  const handleOpen = (event) => {
    if (disabled) return;
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOpenFte = () => {
    handleClose();
    if (!canManageFte) return;
    onOpenFte?.();
  };

  return (
    <>
      <Tooltip title="More deployment actions">
        <span>
          <IconButton
            size="small"
            color="secondary"
            onClick={handleOpen}
            disabled={disabled}
            aria-label="Deployment actions"
            aria-haspopup="menu"
            aria-expanded={isOpen ? 'true' : undefined}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleOpenFte} disabled={!canManageFte}>
          <CalculateOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
          <ListItemText primary="FTE" />
        </MenuItem>
      </Menu>
    </>
  );
}
