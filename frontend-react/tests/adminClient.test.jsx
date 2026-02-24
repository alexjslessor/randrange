

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminApi } from '../src/api/adminClient';

describe('adminApi', () => {
  let axiosInstance;
  let api;

  beforeEach(() => {
    axiosInstance = {
      get: vi.fn(),
      patch: vi.fn(),
    };
    api = adminApi(axiosInstance);
  });

  describe('fetchAdminUsers', () => {
    it('gets users and returns array data', async () => {
      const rows = [{ id: 'user-1' }];
      axiosInstance.get.mockResolvedValue({ data: rows });

      const response = await api.fetchAdminUsers();

      expect(axiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/users'),
      );
      expect(response).toEqual(rows);
    });

    it('returns an empty array when response data is not an array', async () => {
      axiosInstance.get.mockResolvedValue({ data: null });

      const response = await api.fetchAdminUsers();

      expect(response).toEqual([]);
    });
  });

  describe('fetchAdminGroups', () => {
    it('gets groups and returns array data', async () => {
      const rows = [{ id: 'group-1' }];
      axiosInstance.get.mockResolvedValue({ data: rows });

      const response = await api.fetchAdminGroups();

      expect(axiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/groups'),
      );
      expect(response).toEqual(rows);
    });

    it('returns an empty array when response data is not an array', async () => {
      axiosInstance.get.mockResolvedValue({ data: {} });

      const response = await api.fetchAdminGroups();

      expect(response).toEqual([]);
    });
  });

  describe('fetchAdminRealms', () => {
    it('gets realms and returns array data', async () => {
      const rows = [{ id: 'realm-1' }];
      axiosInstance.get.mockResolvedValue({ data: rows });

      const response = await api.fetchAdminRealms();

      expect(axiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/realms'),
      );
      expect(response).toEqual(rows);
    });

    it('returns an empty array when response data is not an array', async () => {
      axiosInstance.get.mockResolvedValue({ data: 'not-an-array' });

      const response = await api.fetchAdminRealms();

      expect(response).toEqual([]);
    });
  });

  describe('fetchAdminOAuthClients', () => {
    it('gets oauth clients filtered by realm id when provided', async () => {
      const rows = [{ id: 'client-1' }];
      axiosInstance.get.mockResolvedValue({ data: rows });

      const response = await api.fetchAdminOAuthClients('realm-1');

      expect(axiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/oauth-clients'),
        { params: { realm_id: 'realm-1' } },
      );
      expect(response).toEqual(rows);
    });

    it('sends undefined params and returns empty array for non-array data', async () => {
      axiosInstance.get.mockResolvedValue({ data: null });

      const response = await api.fetchAdminOAuthClients();

      expect(axiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/oauth-clients'),
        { params: undefined },
      );
      expect(response).toEqual([]);
    });
  });

  describe('updateGroupPartial', () => {
    it('patches group data and returns response data', async () => {
      const payload = { name: 'Ops Admins', is_active: true };
      const result = { id: 'group-1', ...payload };
      axiosInstance.patch.mockResolvedValue({ data: result });

      const response = await api.updateGroupPartial('group-1', payload);

      expect(axiosInstance.patch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/groups/group-1'),
        payload,
      );
      expect(response).toEqual(result);
    });

    it('returns null when patch response has no data', async () => {
      axiosInstance.patch.mockResolvedValue({});

      const response = await api.updateGroupPartial('group-1', {
        description: null,
      });

      expect(response).toBeNull();
    });
  });
});
