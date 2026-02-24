import DeploymentsPage from '../pages/deployments';
import DeploymentPage from '../pages/deployment';
import SchedulerPage from '../pages/scheduler';
import LoginPage from '../pages/login';
import RegisterPage from '../pages/register';
import DashboardPage from '../pages/account/dashboard.jsx';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ProtectedRoute from '../components/ProtectedRoute';

const withProtectedRoute = (element: JSX.Element, allowedRoles?: string[]) => (
  <ProtectedRoute allowedRoles={allowedRoles}>{element}</ProtectedRoute>
);

const dashboardRoles = ['superuser', 'group_admin'];

export const publicRoutes = [
  {
    path: 'login',
    element: (
      <LoginPage />
    ),
    nav: {
      label: 'Login',
      icon: LoginIcon,
      requiresAuth: false,
    },
  },
  {
    path: 'register',
    element: (
      <RegisterPage />
    ),
    nav: {
      label: 'Register',
      icon: PersonAddIcon,
      requiresAuth: false,
    },
  },
];

export const protectedRoutes = [
  {
    path: 'deployments',
    element: withProtectedRoute(<DeploymentsPage />),
    nav: {
      label: 'Deployments',
      icon: CloudUploadIcon,
      requiresAuth: true,
    },
  },
  {
    path: 'deployment',
    element: withProtectedRoute(<DeploymentPage />),
  },
  // {
  //   path: 'scheduler',
  //   element: withProtectedRoute(<SchedulerPage />),
  //   nav: {
  //     label: 'Scheduler',
  //     icon: ScheduleIcon,
  //     requiresAuth: true,
  //   },
  // },
  {
    path: 'dashboard',
    allowedRoles: ['superuser', 'group_admin'],
    element: withProtectedRoute(<DashboardPage />, dashboardRoles),
    nav: {
      label: 'Dashboard',
      icon: DashboardIcon,
      requiresAuth: true,
    },
  },
];

export const navRoutes = [
  ...protectedRoutes,
  ...publicRoutes,
]
  .filter((route) => Boolean(route.nav))
  .map(({ path, nav, allowedRoles }) => ({
    path: `/${path}`,
    label: nav.label,
    Icon: nav.icon,
    requiresAuth: nav.requiresAuth,
    allowedRoles,
  }));
