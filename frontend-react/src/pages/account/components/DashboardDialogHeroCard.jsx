import { Box, Typography } from '@mui/material';

export default function DashboardDialogHeroCard({
  overline,
  title,
  description,
  children,
}) {
  return (
    <Box
      sx={(theme) => ({
        ...theme.customStyles.dashboard.dialog.sectionCard,
        p: { xs: 1.75, sm: 2.25 },
        background: 'linear-gradient(150deg, rgba(0, 203, 221, 0.22), rgba(143, 42, 163, 0.15))',
        borderColor: 'rgba(0, 203, 221, 0.35)',
      })}
    >
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.1 }}>
        {overline}
      </Typography>
      <Typography variant="h6" sx={{ mt: 0.1, lineHeight: 1.2 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
          {description}
        </Typography>
      ) : null}
      {children ? (
        <Box sx={{ mt: 1.25, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {children}
        </Box>
      ) : null}
    </Box>
  );
}
