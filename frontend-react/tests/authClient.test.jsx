
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../src/api/authClient';
import { httpClient } from '../src/api/httpClient';

vi.mock('../src/api/httpClient', () => ({
  httpClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
  httpClientPrivate: {
    post: vi.fn(),
    get: vi.fn(),
  },
  buildAuthUrl: vi.fn((path) => path),
}));

describe('authApi', () => {
  let api;

  beforeEach(() => {
    httpClient.post.mockReset();
    httpClient.get.mockReset();
    api = authApi();
  });

  describe('loginUser', () => {
    it('authenticates, fetches profile, and maps response fields', async () => {
      httpClient.post.mockResolvedValue({
        data: { access_token: 'access-123', refresh_token: 'refresh-456' },
      });
      httpClient.get.mockResolvedValue({
        data: {
          id: 'user-1',
          username: 'alice',
          realm_id: 'realm-1',
          groups: ['engineering', 'engineering', 9],
          permissions: ['read'],
          is_superuser: false,
          is_group_admin: true,
          admin_group_ids: ['group-1'],
          is_active: true,
          auth_provider: 'local',
        },
      });

      const response = await api.loginUser({
        username: 'alice',
        password: 'secret',
      });

      expect(httpClient.post).toHaveBeenCalledWith(
        '/login',
        expect.any(String),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      const formBody = httpClient.post.mock.calls[0][1];
      const params = new URLSearchParams(formBody);
      expect(params.get('username')).toBe('alice');
      expect(params.get('password')).toBe('secret');

      expect(httpClient.get).toHaveBeenCalledWith('/users/me', {
        headers: {
          Authorization: 'Bearer access-123',
        },
      });

      expect(response).toEqual({
        id: 'user-1',
        username: 'alice',
        realm_id: 'realm-1',
        email: null,
        roles: ['group_admin', 'engineering', 'engineering'],
        groups: ['engineering', 'engineering', 9],
        permissions: ['read'],
        is_superuser: false,
        is_group_admin: true,
        admin_group_ids: ['group-1'],
        is_active: true,
        auth_provider: 'local',
        access_token: 'access-123',
        refresh_token: 'refresh-456',
      });
    });

    it('assigns superuser role and defaults missing profile fields', async () => {
      httpClient.post.mockResolvedValue({
        data: { access_token: 'access-xyz', refresh_token: 'refresh-xyz' },
      });
      httpClient.get.mockResolvedValue({
        data: {
          id: 'user-2',
          username: 'root',
          realm_id: 'realm-2',
          is_superuser: true,
          is_group_admin: true,
          groups: ['ops'],
        },
      });

      const response = await api.loginUser({
        username: 'root',
        password: 'secret',
      });

      expect(response.roles).toEqual(['superuser']);
      expect(response.groups).toEqual(['ops']);
      expect(response.permissions).toEqual([]);
      expect(response.admin_group_ids).toEqual([]);
      expect(response.is_active).toBe(false);
    });
  });

  describe('refresh', () => {
    it('posts refresh token in password field as OAuth2PasswordRequestForm expects', async () => {
      const result = { data: { access_token: 'new-access' } };
      httpClient.post.mockResolvedValue(result);

      const response = await api.refresh('refresh-123');

      expect(httpClient.post).toHaveBeenCalledWith(
        '/refresh',
        expect.any(String),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      const formBody = httpClient.post.mock.calls[0][1];
      const params = new URLSearchParams(formBody);
      expect(params.get('password')).toBe('refresh-123');
      expect(response).toBe(result);
    });
  });

  describe('getMe', () => {
    it('gets current user with bearer token header', async () => {
      const result = { data: { id: 'user-1' } };
      httpClient.get.mockResolvedValue(result);

      const response = await api.getMe('access-123');

      expect(httpClient.get).toHaveBeenCalledWith('/users/me', {
        headers: {
          Authorization: 'Bearer access-123',
        },
      });
      expect(response).toBe(result);
    });
  });

  describe('register', () => {
    it('posts payload to /register', async () => {
      const payload = { username: 'alice', password: 'secret' };
      const result = { data: { id: 'user-1' } };
      httpClient.post.mockResolvedValue(result);

      const response = await api.register(payload);

      expect(httpClient.post).toHaveBeenCalledWith('/register', payload);
      expect(response).toBe(result);
    });
  });
});
