
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { metadataApi } from '../src/api/metadataClient';

describe('metadataApi', () => {
  let axiosInstance;
  let api;

  beforeEach(() => {
    axiosInstance = {
      get: vi.fn(),
      put: vi.fn(),
    };
    api = metadataApi(axiosInstance);
  });

  describe('getDeploymentFte', () => {
    it('returns null without calling API when deployment id is missing', async () => {
      const response = await api.getDeploymentFte('');

      expect(response).toBeNull();
      expect(axiosInstance.get).not.toHaveBeenCalled();
    });

    it('fetches deployment FTE metadata', async () => {
      const payload = { id: 'fte-1', deployment_id: 'dep-1' };
      axiosInstance.get.mockResolvedValue({ data: payload });

      const response = await api.getDeploymentFte('dep-1');

      expect(axiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/metadata/deployments/dep-1/fte'),
      );
      expect(response).toEqual(payload);
    });

    it('returns null when API response has no data', async () => {
      axiosInstance.get.mockResolvedValue({});

      const response = await api.getDeploymentFte('dep-1');

      expect(response).toBeNull();
    });
  });

  describe('upsertDeploymentFte', () => {
    it('throws when deployment id is missing', async () => {
      await expect(
        api.upsertDeploymentFte('', {
          avg_human_minutes_per_case: 30,
          analyst_hourly_cost: 60,
        }),
      ).rejects.toThrow('Deployment id is required');

      expect(axiosInstance.put).not.toHaveBeenCalled();
    });

    it('upserts deployment FTE metadata', async () => {
      const payload = {
        avg_human_minutes_per_case: 30,
        analyst_hourly_cost: 60,
      };
      const result = { id: 'fte-1', deployment_id: 'dep-1' };
      axiosInstance.put.mockResolvedValue({ data: result });

      const response = await api.upsertDeploymentFte('dep-1', payload);

      expect(axiosInstance.put).toHaveBeenCalledWith(
        expect.stringContaining('/metadata/deployments/dep-1/fte'),
        payload,
      );
      expect(response).toEqual(result);
    });
  });

  describe('getFteSummary', () => {
    it('fetches summary using default month window', async () => {
      const rows = [{ deployment_id: 'dep-1' }];
      axiosInstance.get.mockResolvedValue({ data: rows });

      const response = await api.getFteSummary();

      expect(axiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/metadata/fte/summary'),
        { params: { window: 'month' } },
      );
      expect(response).toEqual(rows);
    });

    it('fetches summary using provided window', async () => {
      axiosInstance.get.mockResolvedValue({ data: [] });

      await api.getFteSummary('week');

      expect(axiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/metadata/fte/summary'),
        { params: { window: 'week' } },
      );
    });

    it('returns an empty array when response data is not an array', async () => {
      axiosInstance.get.mockResolvedValue({ data: null });

      const response = await api.getFteSummary('today');

      expect(response).toEqual([]);
    });
  });

  describe('getFlowRunNote', () => {
    it('returns null without calling API when flow run id is missing', async () => {
      const response = await api.getFlowRunNote('');

      expect(response).toBeNull();
      expect(axiosInstance.get).not.toHaveBeenCalled();
    });

    it('fetches flow run note', async () => {
      const note = { id: 'note-1', flow_run_id: 'run-1', note_text: 'Hello' };
      axiosInstance.get.mockResolvedValue({ data: note });

      const response = await api.getFlowRunNote('run-1');

      expect(axiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/metadata/flow_runs/run-1/note'),
      );
      expect(response).toEqual(note);
    });

    it('returns null when API response has no data', async () => {
      axiosInstance.get.mockResolvedValue({});

      const response = await api.getFlowRunNote('run-1');

      expect(response).toBeNull();
    });
  });

  describe('upsertFlowRunNote', () => {
    it('throws when flow run id is missing', async () => {
      await expect(
        api.upsertFlowRunNote('', { note_text: 'hello' }),
      ).rejects.toThrow('Flow run id is required');

      expect(axiosInstance.put).not.toHaveBeenCalled();
    });

    it('upserts flow run note', async () => {
      const payload = { note_text: 'hello' };
      const note = { id: 'note-1', flow_run_id: 'run-1', note_text: 'hello' };
      axiosInstance.put.mockResolvedValue({ data: note });

      const response = await api.upsertFlowRunNote('run-1', payload);

      expect(axiosInstance.put).toHaveBeenCalledWith(
        expect.stringContaining('/metadata/flow_runs/run-1/note'),
        payload,
      );
      expect(response).toEqual(note);
    });
  });
});
