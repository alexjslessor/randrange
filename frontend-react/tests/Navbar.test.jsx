import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Navbar from '../src/components/Navbar';

vi.mock('../src/context', () => ({
  useAuthContext: vi.fn(),
}));

import { useAuthContext } from '../src/context';

const renderNavbar = (contextValue = {}) => {
  useAuthContext.mockReturnValue({
    isLoggedIn: false,
    logoutAction: vi.fn(),
    username: '',
    ...contextValue,
  });
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  );
};

describe('Navbar', () => {
  it('renders Login button when not logged in', () => {
    renderNavbar({ isLoggedIn: false });
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('renders Logout button when logged in', () => {
    renderNavbar({ isLoggedIn: true, username: 'alice' });
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('renders username when logged in', () => {
    renderNavbar({ isLoggedIn: true, username: 'alice' });
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('calls logoutAction when Logout is clicked', () => {
    const logoutAction = vi.fn();
    renderNavbar({ isLoggedIn: true, username: 'alice', logoutAction });
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(logoutAction).toHaveBeenCalledTimes(1);
  });

  it('renders logo link to deployments', () => {
    renderNavbar();
    expect(screen.getByLabelText('Go to deployments')).toBeInTheDocument();
  });
});
