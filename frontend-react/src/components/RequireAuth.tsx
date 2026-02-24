import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context';

export default function RequireAuth() {
  const { user } = useAuthContext();
  const location = useLocation();
  const token = (typeof window !== 'undefined' && localStorage.getItem('auth_token')) || '';

  if (!user && !token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}