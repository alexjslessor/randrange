
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prefectGatewayApi } from '../src/api/prefectGatewayClient';

describe('prefectGatewayApi', () => {
  let axiosInstance;
  let api;

  beforeEach(() => {
    axiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
    };
    api = prefectGatewayApi(axiosInstance);
  });

  describe('paginateDeployments', () => {
    it('posts payload and returns response data', async () => {
      const payload = { limit: 10 };
      const result = { items: [] };
      axiosInstance.post.mockResolvedValue({ data: result });

      const response = await api.paginateDeployments(payload);

      expect(axiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining('/deployments/paginate'),
        payload,
      );
      expect(response).toEqual(result);
    });
  });

  describe('listScheduledDeploymentIds', () => {
    it('gets scheduled ids and stringifies each id', async () => {
      axiosInstance.get.mockResolvedValue({ data: [1, '2', null] });

      const response = await api.listScheduledDeploymentIds('2026-02-22');

      expect(axiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/deployments/scheduled-ids'),
        { params: { date: '2026-02-22' } },
      );
      expect(response).toEqual(['1', '2', 'null']);
    });
  });

  describe('listRunnableDeploymentIds', () => {
    it('posts payload and returns stringified ids', async () => {
      const payload = { team: 'ops' };
      axiosInstance.post.mockResolvedValue({ data: [3, '4'] });

      const response = await api.listRunnableDeploymentIds(payload);

      expect(axiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining('/deployments/runnable-ids'),
        payload,
      );
      expect(response).toEqual(['3', '4']);
    });
  });

  describe('readDeployment', () => {
    it('gets a deployment by id', async () => {
      const deployment = { id: 'dep-1' };
      axiosInstance.get.mockResolvedValue({ data: deployment });

      const response = await api.readDeployment('dep-1');

      expect(axiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/deployments/dep-1'),
      );
      expect(response).toEqual(deployment);
    });
  });

  describe('listDeploymentRuns', () => {
    it('gets deployment runs with default limit', async () => {
      const runs = [{ id: 'run-1' }];
      axiosInstance.get.mockResolvedValue({ data: runs });

      const response = await api.listDeploymentRuns('dep-1');

      expect(axiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/deployments/dep-1/runs'),
        { params: { limit: 100 } },
      );
      expect(response).toEqual(runs);
    });
  });

  describe('createDeploymentFlowRun', () => {
    it('creates a flow run for deployment', async () => {
      const payload = { parameters: { x: 1 } };
      const run = { id: 'run-1' };
      axiosInstance.post.mockResolvedValue({ data: run });

      const response = await api.createDeploymentFlowRun('dep-1', payload);

      expect(axiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining('/deployments/dep-1/create_flow_run'),
        payload,
      );
      expect(response).toEqual(run);
    });
  });

  describe('getScheduledFlowRunsForDeployments', () => {
    it('posts payload and returns array response', async () => {
      const payload = { deployment_ids: ['dep-1'] };
      const rows = [{ id: 'run-1' }];
      axiosInstance.post.mockResolvedValue({ data: rows });

      const response = await api.getScheduledFlowRunsForDeployments(payload);

      expect(axiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining('/deployments/get_scheduled_flow_runs'),
        payload,
      );
      expect(response).toEqual(rows);
    });
  });

  describe('filterFlowRuns', () => {
    it('posts payload and returns filtered runs', async () => {
      const payload = { limit: 5 };
      const runs = [{ id: 'run-1' }];
      axiosInstance.post.mockResolvedValue({ data: runs });

      const response = await api.filterFlowRuns(payload);

      expect(axiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining('/flow_runs/filter'),
        payload,
      );
      expect(response).toEqual(runs);
    });
  });

  describe('countFlowRuns', () => {
    it('returns count when API returns a number', async () => {
      axiosInstance.post.mockResolvedValue({ data: 7 });

      const response = await api.countFlowRuns({ state: 'COMPLETED' });

      expect(axiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining('/flow_runs/count'),
        { state: 'COMPLETED' },
      );
      expect(response).toBe(7);
    });

    it('returns 0 when API returns non-number', async () => {
      axiosInstance.post.mockResolvedValue({ data: '7' });

      const response = await api.countFlowRuns({});

      expect(response).toBe(0);
    });
  });

  describe('flowRunHistory', () => {
    it('posts payload and returns history rows', async () => {
      const payload = { history_start: '2026-02-01' };
      const rows = [{ interval_start: '2026-02-01T00:00:00Z' }];
      axiosInstance.post.mockResolvedValue({ data: rows });

      const response = await api.flowRunHistory(payload);

      expect(axiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining('/flow_runs/history'),
        payload,
      );
      expect(response).toEqual(rows);
    });
  });

  describe('averageFlowRunLateness', () => {
    it('returns number when API returns finite number', async () => {
      axiosInstance.post.mockResolvedValue({ data: 1.75 });

      const response = await api.averageFlowRunLateness({ days: 7 });

      expect(axiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining('/flow_runs/lateness'),
        { days: 7 },
      );
      expect(response).toBe(1.75);
    });

    it('returns null for non-finite values', async () => {
      axiosInstance.post.mockResolvedValue({ data: Number.POSITIVE_INFINITY });

      const response = await api.averageFlowRunLateness({});

      expect(response).toBeNull();
    });
  });

  describe('filterLogs', () => {
    it('posts payload and returns log rows', async () => {
      const payload = { limit: 2 };
      const logs = [{ id: 'log-1' }];
      axiosInstance.post.mockResolvedValue({ data: logs });

      const response = await api.filterLogs(payload);

      expect(axiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining('/logs/filter'),
        payload,
      );
      expect(response).toEqual(logs);
    });
  });

  describe('listAdminPrefectDeployments', () => {
    it('gets deployments with default limit', async () => {
      const rows = [{ id: 'dep-1' }];
      axiosInstance.get.mockResolvedValue({ data: rows });

      const response = await api.listAdminPrefectDeployments();

      expect(axiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/prefect/deployments'),
        { params: { limit: 200 } },
      );
      expect(response).toEqual(rows);
    });
  });
});
