import { Alert, Box, Typography } from '@mui/material';

const resolveSeverity = (value) => {
  const input = String(value || '').trim().toLowerCase();
  if (input === 'success') return 'success';
  if (input === 'warning') return 'warning';
  if (input === 'info') return 'info';
  return 'error';
};

export default function ErrorMsg({ msg = 'Something went wrong.', color = 'error' }) {
  return (
    <Box sx={{ mt: 2, px: 1 }}>
      <Alert
        severity={resolveSeverity(color)}
        sx={{
          borderRadius: 2,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          background: 'rgba(21, 21, 21, 0.55)',
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
      >
        <Typography variant="body2">
          {msg}
        </Typography>
      </Alert>
    </Box>
  );
}
