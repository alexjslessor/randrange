import { Link, useNavigate } from 'react-router-dom';
import { AppBar, Box, Button, IconButton, Toolbar } from '@mui/material';
import { useAuthContext } from '../context';

export default function Navbar() {
  const { isLoggedIn, logoutAction, username } = useAuthContext();
  const navigate = useNavigate();

  const handleAuthClick = () => {
    if (isLoggedIn) {
      logoutAction();
    }
    navigate('/login');
  };

  return (
    <AppBar
      position="sticky"
      className="app-navbar"
      color="transparent"
      elevation={0}
      enableColorOnDark
      sx={{
        backgroundColor: 'transparent',
        backgroundImage: 'none',
        boxShadow: 'none',
        backdropFilter: 'none',
      }}
    >
      <Toolbar
        sx={{
          px: { xs: 2, sm: 3 },
          minHeight: { xs: 64, sm: 68 },
          gap: 1,
        }}
      >
        <IconButton
          disabled
          color="inherit"
          edge="start"
          aria-label="Navigation drawer menu"
          sx={{
            color: '#e8ecff',
            mr: 1,
            borderRadius: 2.5,
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.08)',
            },
          }}
        >
          {/* <MenuIcon /> */}
        </IconButton>

        <Link to="/deployments" className="app-navbar__logo" aria-label="Go to deployments">
          <img src="/logo1.png" alt="" className="app-navbar__logo-mark" aria-hidden="true" />
          <span className="app-navbar__logo-text"></span>
        </Link>

        <Box sx={{ flexGrow: 1 }} />

        <Box className="app-navbar__actions">
          {isLoggedIn && username ? (
            <Box
              component="span"
              sx={{
                color: '#cdd6ff',
                px: 1.5,
                py: 0.75,
                borderRadius: 999,
                fontSize: '0.85rem',
                letterSpacing: '0.01em',
                background: 'rgba(16, 22, 42, 0.75)',
                boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.12)',
              }}
              aria-label={`Logged in as ${username}`}
            >
              {username}
            </Box>
          ) : null}
          <Button type="button" className="app-navbar__button" onClick={handleAuthClick}>
            {isLoggedIn ? 'Logout' : 'Login'}
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
