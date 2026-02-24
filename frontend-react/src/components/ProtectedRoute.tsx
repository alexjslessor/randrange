import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context';

type Props = PropsWithChildren & {
  allowedRoles?: string[];
  allowSpecificOrg?: {
    role: string;
    organizationName: string;
  };
};
const ProtectedRoute = ({
  allowedRoles,
  children,
  allowSpecificOrg,
}: Props) => {
  const { user, roles } = useAuthContext();
  const location = useLocation();

  const token =
    (typeof window !== 'undefined' && localStorage.getItem('auth_token')) || '';

      // Check if initial authentication is still in progress
  // if (authInitializing) {
  //   return (
  //     <Box sx={{ display: "flex" }}>
  //       <CircularProgress />
  //     </Box>
  //   );
  // }

  if (!user && !token) {
    // useNavigate('/login');
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const hasAllowedRole = allowedRoles?.length
    ? roles.some((role: string) => allowedRoles.includes(role))
    : true;

  // // Check if user meets the specific organization and role criteria
  // const hasSpecificOrgAccess =
  //   allowSpecificOrg &&
  //   user?.roles.includes(allowSpecificOrg.role) &&
  //   user?.organization.name === allowSpecificOrg.organizationName;

  // if (allowedRoles && !hasAllowedRole && !hasSpecificOrgAccess) {
  if (!hasAllowedRole) {
    return <div>Permission denied.</div>;
  }

  return children;
  // return <Outlet />;
};

export default ProtectedRoute;
