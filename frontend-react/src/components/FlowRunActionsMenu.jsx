import { useState } from 'react';
import {
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export default function FlowRunActionsMenu({
  onOpenNotes,
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

  const handleOpenNotes = () => {
    handleClose();
    onOpenNotes?.();
  };

  return (
    <>
      <Tooltip title="More run actions">
        <span>
          <IconButton
            size="small"
            color="secondary"
            onClick={handleOpen}
            disabled={disabled}
            aria-label="Flow run actions"
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
        <MenuItem onClick={handleOpenNotes}>
          <NoteAltOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
          <ListItemText primary="Notes" />
        </MenuItem>
      </Menu>
    </>
  );
}
