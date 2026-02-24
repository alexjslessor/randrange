import { render, screen, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuthContext } from '../src/context/AuthContext';

const { loginUserMock } = vi.hoisted(() => ({
  loginUserMock: vi.fn(),
}));

vi.mock('../src/api/authClient', () => ({
  authApi: () => ({
    loginUser: loginUserMock,
  }),
}));

let authRef;

const AuthStateProbe = () => {
  authRef = useAuthContext();
  return <div data-testid="is-logged-in">{String(authRef.isLoggedIn)}</div>;
};

const renderWithProviders = (ui) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>
  );
};

describe('AuthContext login', () => {
  beforeEach(() => {
    loginUserMock.mockReset();
    localStorage.clear();
    authRef = undefined;
  });

  it('defaults to logged out without a token', () => {
    renderWithProviders(<AuthStateProbe />);

    expect(screen.getByTestId('is-logged-in').textContent).toBe('false');
  });

  it('hydrates as logged in when a token exists', () => {
    localStorage.setItem('auth_token', 'existing-token');

    renderWithProviders(<AuthStateProbe />);

    expect(screen.getByTestId('is-logged-in').textContent).toBe('true');
  });

  it('marks logged in after loginAction', async () => {
    loginUserMock.mockResolvedValue({
      id: 'user-1',
      name: 'Test User',
      username: 'test@example.com',
      access_token: 'new-token',
    });

    renderWithProviders(<AuthStateProbe />);

    await act(async () => {
      await authRef.loginAction({ email: 'test@example.com', password: 'pw' });
    });

    expect(screen.getByTestId('is-logged-in').textContent).toBe('true');
    expect(localStorage.getItem('auth_token')).toBe('new-token');
  });
});
