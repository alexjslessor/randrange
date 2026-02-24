import { Box, CircularProgress, Typography } from '@mui/material';

const resolveProgressColor = (value) => {
  const color = String(value || '').trim().toLowerCase();
  if (color === 'secondary') return 'secondary';
  if (color === 'inherit') return 'inherit';
  if (color === 'success') return 'success';
  if (color === 'error') return 'error';
  if (color === 'info') return 'info';
  if (color === 'warning') return 'warning';
  return 'primary';
};

export default function LoadingMsg({ msg = 'Loading...', color = 'primary' }) {
  return (
    <Box
      sx={{
        minHeight: '42vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
      }}
    >
      <Box
        sx={{
          display: 'grid',
          justifyItems: 'center',
          gap: 1.25,
          p: 2.25,
          borderRadius: 2,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <CircularProgress size={30} thickness={4.5} color={resolveProgressColor(color)} />
        <Typography variant="body2" color="text.secondary">
          {msg}
        </Typography>
      </Box>
    </Box>
  );
}
