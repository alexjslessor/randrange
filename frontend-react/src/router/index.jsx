import { createBrowserRouter } from "react-router-dom";
import Layout from '../layouts/Layout';
// import RequireAuth from './components/RequireAuth';
// import ProtectedRoute from './components/ProtectedRoute';
import { protectedRoutes, publicRoutes } from './routeConfig';

const buildChildren = (routes) =>
  routes.map(({ path, element }) => ({
    path,
    element,
  }));

export const router = createBrowserRouter([
  { // un-authenticated routes
    element: <Layout />,
    children: [
      {
        path: '/',
        children: buildChildren(publicRoutes),
      },
    ],
  },
  { // Authenticated routes
    element: <Layout />,
    children: [
      {
        path: '/',
        children: buildChildren(protectedRoutes),
      },
    ],
  },
]);

