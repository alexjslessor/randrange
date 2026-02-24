import { httpClient } from './httpClient';
import { LoginForm } from '../types';

export const authApi = () => ({
  loginUser: async (form: LoginForm) => {
    const formData = new URLSearchParams();
    formData.append('username', form.username);
    formData.append('password', form.password);

    const tokenResp = await httpClient.post('/login', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const token = tokenResp.data;
    const meResp = await httpClient.get('/users/me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    const profile = meResp.data;
    const roles = profile.is_superuser
      ? ['superuser']
      : [
          ...(profile.is_group_admin ? ['group_admin'] : []),
          ...(Array.isArray(profile.groups) ? profile.groups.filter((g: unknown) => typeof g === 'string') : []),
        ];
    return {
      id: profile.id,
      username: profile.username,
      realm_id: profile.realm_id,
      email: profile.email ?? null,
      groups: profile.groups ?? [],
      permissions: profile.permissions ?? [],
      roles,
      is_superuser: Boolean(profile.is_superuser),
      is_group_admin: Boolean(profile.is_group_admin),
      admin_group_ids: profile.admin_group_ids ?? [],
      is_active: Boolean(profile.is_active),
      auth_provider: profile.auth_provider,
      access_token: token.access_token,
      refresh_token: token.refresh_token ?? '',
    };
  },

  refresh: async (refreshToken: string) => {
    const formData = new URLSearchParams();
    formData.append('username', '');
    formData.append('password', refreshToken);
    return httpClient.post('/refresh', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },

  getMe: async (token: string) =>
    httpClient.get('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  register: async (payload: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) => httpClient.post('/register', payload),
});
