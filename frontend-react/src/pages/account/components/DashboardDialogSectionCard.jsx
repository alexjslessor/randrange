import { Box, Divider, Typography } from '@mui/material';

export default function DashboardDialogSectionCard({
  title,
  description,
  children,
}) {
  return (
    <Box sx={(theme) => theme.customStyles.dashboard.dialog.sectionCard}>
      <Typography variant="subtitle2">{title}</Typography>
      {description ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
          {description}
        </Typography>
      ) : null}
      <Divider sx={{ my: 1.4, borderColor: 'rgba(255,255,255,0.09)' }} />
      {children}
    </Box>
  );
}
