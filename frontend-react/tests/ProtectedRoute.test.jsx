import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProtectedRoute from '../src/components/ProtectedRoute';

vi.mock('../src/context', () => ({
  useAuthContext: vi.fn(),
}));

import { useAuthContext } from '../src/context';

const renderRoute = ({ user = null, roles = [], allowedRoles = undefined } = {}) => {
  useAuthContext.mockReturnValue({ user, roles });
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
};

describe('ProtectedRoute', () => {
  it('redirects to login when no user and no token', () => {
    renderRoute({ user: null });
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when user is present and no role restriction', () => {
    renderRoute({ user: { id: '1' }, roles: [] });
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders children when user has an allowed role', () => {
    renderRoute({ user: { id: '1' }, roles: ['admin'], allowedRoles: ['admin'] });
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows permission denied when user lacks required role', () => {
    renderRoute({ user: { id: '1' }, roles: ['viewer'], allowedRoles: ['admin'] });
    expect(screen.getByText('Permission denied.')).toBeInTheDocument();
  });
});
