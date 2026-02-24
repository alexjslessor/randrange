import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';

const StyledBoxListItem = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  height: '100vh',
  mt: { xs: 3, sm: 1, md: 3, lg: 1, xl: 3 },
  mb: { xs: 1, sm: 2, md: 3, lg: 1, xl: 1 },
}));

export default StyledBoxListItem;
