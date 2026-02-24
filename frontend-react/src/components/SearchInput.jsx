import { useEffect, useState } from 'react';
import {
  Box,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';

export default function SearchInput({
  onSearch,
  placeholder = 'Search',
  disabled = false,
  defaultValue = '',
  size = 'small',
}) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const submitSearch = (event) => {
    if (event) {
      event.preventDefault();
    }
    onSearch?.(value.trim());
  };

  const clearSearch = () => {
    setValue('');
    onSearch?.('');
  };

  return (
    <Box
      component="form"
      onSubmit={submitSearch}
      sx={{
        width: '100%',
        maxWidth: 560,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <TextField
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        size={size}
        fullWidth
        placeholder={placeholder}
        autoComplete="off"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: value ? (
            <InputAdornment position="end">
              <Tooltip title="Clear">
                <span>
                  <IconButton
                    aria-label="Clear search"
                    edge="end"
                    size="small"
                    onClick={clearSearch}
                    disabled={disabled}
                  >
                    <ClearRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </InputAdornment>
          ) : null,
        }}
        sx={{
          '& .MuiInputBase-root': {
            borderRadius: 999,
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
          },
        }}
      />
      <Tooltip title="Search">
        <span>
          <IconButton
            type="submit"
            aria-label="Run search"
            color="primary"
            disabled={disabled}
            sx={{
              border: '1px solid rgba(255, 255, 255, 0.16)',
              backgroundColor: 'rgba(20, 109, 197, 0.22)',
              '&:hover': {
                backgroundColor: 'rgba(20, 109, 197, 0.4)',
              },
            }}
          >
            <SearchRoundedIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
