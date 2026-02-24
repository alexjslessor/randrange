import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import { navRoutes } from '../router/routeConfig';
import { useAuthContext } from '../context';

const drawerWidth = 220;
const collapsedWidth = 70;

export default function SideNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { isLoggedIn, roles } = useAuthContext();

  const items = useMemo(
    () =>
      navRoutes.filter((route) => {
        if (route.requiresAuth ? !isLoggedIn : isLoggedIn) {
          return false;
        }

        if (route.allowedRoles?.length) {
          return route.allowedRoles.some((role) => roles.includes(role));
        }

        return true;
      }),
    [isLoggedIn, roles]
  );

  return (
    <Drawer
      variant="permanent"
      PaperProps={{
        component: 'nav',
        'aria-label': 'Primary navigation',
        onMouseEnter: () => setOpen(true),
        onMouseLeave: () => setOpen(false),
      }}
      sx={(theme) => ({
        width: collapsedWidth,
        minWidth: collapsedWidth,
        maxWidth: collapsedWidth,
        flex: `0 0 ${collapsedWidth}px`,
        flexShrink: 0,
        alignSelf: 'flex-start',
        position: 'relative',
        overflow: 'visible',
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : collapsedWidth,
          position: 'fixed',
          top: { xs: 80, sm: 92 },
          left: { xs: 16, sm: 24 },
          // bottom: { xs: 16, sm: 24 },
          height: 'auto',
          overflowX: 'hidden',
          // overflowY: 'auto',
          scrollBehavior: 'smooth',
          zIndex: theme.zIndex.appBar - 1,
          borderRadius: 18,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background:
            'linear-gradient(180deg, rgba(14, 20, 40, 0.98), rgba(7, 10, 20, 0.98))',
          color: '#e8ecff',
          boxShadow: '0 18px 36px rgba(2, 6, 16, 0.45)',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: open
              ? theme.transitions.duration.enteringScreen
              : theme.transitions.duration.leavingScreen,
          }),
        },
      })}
    >
      <List
        sx={{
          px: 1,
          py: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
        }}
      >
        {items.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`);
          const button = (
            <ListItemButton
              component={Link}
              to={item.path}
              selected={isActive}
              sx={{
                minHeight: 48,
                justifyContent: open ? 'initial' : 'center',
                px: open ? 2 : 1.5,
                borderRadius: 12,
                transition: 'background 0.2s ease, color 0.2s ease',
                '&.Mui-selected': {
                  background: 'rgba(123, 91, 255, 0.22)',
                  boxShadow: 'inset 0 0 0 1px rgba(123, 91, 255, 0.45)',
                  color: '#fff',
                },
                '&.Mui-selected:hover': {
                  background: 'rgba(123, 91, 255, 0.32)',
                },
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.08)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 2 : 'auto',
                  justifyContent: 'center',
                  color: 'inherit',
                }}
              >
                <item.Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                sx={{
                  opacity: open ? 1 : 0,
                  transition: 'opacity 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              />
            </ListItemButton>
          );

          return (
            <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
              {open ? (
                button
              ) : (
                <Tooltip title={item.label} placement="right">
                  {button}
                </Tooltip>
              )}
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
}
