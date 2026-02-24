import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import RequireAuth from '../src/components/RequireAuth';

vi.mock('../src/context', () => ({
  useAuthContext: vi.fn(),
}));

import { useAuthContext } from '../src/context';

const renderRoute = (user = null) => {
  useAuthContext.mockReturnValue({ user });
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
};

describe('RequireAuth', () => {
  it('redirects to login when no user and no token', () => {
    renderRoute(null);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders outlet when user is present', () => {
    renderRoute({ id: '1' });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
