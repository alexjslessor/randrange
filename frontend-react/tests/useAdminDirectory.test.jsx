import { describe, expect, it, vi } from 'vitest';
import { patchGroup } from '../src/hooks/useGroupPatch';


describe('patchGroup', () => {
  it('updates groups using PATCH only', async () => {
    const axiosInstance = {
      patch: vi.fn().mockResolvedValue({ data: { id: 'group-1', name: 'Updated Group' } }),
      put: vi.fn(),
    };

    const response = await patchGroup(axiosInstance, {
      groupId: 'group-1',
      name: 'Updated Group',
      description: 'Updated description',
    });

    expect(axiosInstance.patch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/groups/group-1'),
      {
        name: 'Updated Group',
        description: 'Updated description',
      },
    );
    expect(axiosInstance.put).not.toHaveBeenCalled();
    expect(response).toEqual({ id: 'group-1', name: 'Updated Group' });
  });

  it('surfaces PATCH errors', async () => {
    const error = Object.assign(new Error('method_not_allowed'), {
      response: { status: 405 },
    });
    const axiosInstance = {
      patch: vi.fn().mockRejectedValue(error),
      put: vi.fn(),
    };

    await expect(
      patchGroup(axiosInstance, {
        groupId: 'group-1',
        name: 'Updated Group',
      }),
    ).rejects.toBe(error);

    expect(axiosInstance.put).not.toHaveBeenCalled();
  });

  it('requires a group id', async () => {
    const axiosInstance = {
      patch: vi.fn(),
      put: vi.fn(),
    };

    await expect(
      patchGroup(axiosInstance, {
        name: 'Updated Group',
      }),
    ).rejects.toThrow('Group id is required');

    expect(axiosInstance.patch).not.toHaveBeenCalled();
    expect(axiosInstance.put).not.toHaveBeenCalled();
  });
});
