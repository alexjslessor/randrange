import {
  buildAuthUrl,
  httpClientPrivate,
} from './httpClient';

type Dict = Record<string, unknown>;
type DynamicList = Dict[];

const asArray = (value: unknown): DynamicList => (
  Array.isArray(value) ? value as DynamicList : []
);

export const prefectGatewayApi = (axiosInstance = httpClientPrivate) => {
  return {
    paginateDeployments: async (payload: Dict = {}): Promise<Dict> => {
      const response = await axiosInstance.post(
        buildAuthUrl('/deployments/paginate'),
        payload,
      );
      return (response?.data ?? {}) as Dict;
    },

    listScheduledDeploymentIds: async (date: string): Promise<string[]> => {
      const response = await axiosInstance.get(
        buildAuthUrl('/deployments/scheduled-ids'),
        {
          params: { date },
        },
      );
      return Array.isArray(response?.data)
        ? response.data.map((id: unknown) => String(id))
        : [];
    },

    listRunnableDeploymentIds: async (payload: Dict = {}): Promise<string[]> => {
      const response = await axiosInstance.post(
        buildAuthUrl('/deployments/runnable-ids'),
        payload,
      );
      return Array.isArray(response?.data)
        ? response.data.map((id: unknown) => String(id))
        : [];
    },

    readDeployment: async (deploymentId: string): Promise<Dict> => {
      const response = await axiosInstance.get(
        buildAuthUrl(`/deployments/${deploymentId}`),
      );
      return (response?.data ?? {}) as Dict;
    },

    listDeploymentRuns: async (
      deploymentId: string,
      limit = 100,
    ): Promise<DynamicList> => {
      const response = await axiosInstance.get(
        buildAuthUrl(`/deployments/${deploymentId}/runs`),
        {
          params: { limit },
        },
      );
      return asArray(response?.data);
    },

    createDeploymentFlowRun: async (
      deploymentId: string,
      payload: Dict = {},
    ): Promise<Dict> => {
      const response = await axiosInstance.post(
        buildAuthUrl(`/deployments/${deploymentId}/create_flow_run`),
        payload,
      );
      return (response?.data ?? {}) as Dict;
    },

    getScheduledFlowRunsForDeployments: async (
      payload: Dict = {},
    ): Promise<DynamicList> => {
      const response = await axiosInstance.post(
        buildAuthUrl('/deployments/get_scheduled_flow_runs'),
        payload,
      );
      return asArray(response?.data);
    },

    filterFlowRuns: async (payload: Dict = {}): Promise<DynamicList> => {
      const response = await axiosInstance.post(
        buildAuthUrl('/flow_runs/filter'),
        payload,
      );
      return asArray(response?.data);
    },

    countFlowRuns: async (payload: Dict = {}): Promise<number> => {
      const response = await axiosInstance.post(
        buildAuthUrl('/flow_runs/count'),
        payload,
      );
      return typeof response?.data === 'number' ? response.data : 0;
    },

    flowRunHistory: async (payload: Dict): Promise<DynamicList> => {
      const response = await axiosInstance.post(
        buildAuthUrl('/flow_runs/history'),
        payload,
      );
      return asArray(response?.data);
    },

    averageFlowRunLateness: async (payload: Dict = {}): Promise<number | null> => {
      const response = await axiosInstance.post(
        buildAuthUrl('/flow_runs/lateness'),
        payload,
      );
      return typeof response?.data === 'number' && Number.isFinite(response.data)
        ? response.data
        : null;
    },

    filterLogs: async (payload: Dict = {}): Promise<DynamicList> => {
      const response = await axiosInstance.post(
        buildAuthUrl('/logs/filter'),
        payload,
      );
      return asArray(response?.data);
    },

    listAdminPrefectDeployments: async (limit = 200): Promise<DynamicList> => {
      const response = await axiosInstance.get(
        buildAuthUrl('/admin/prefect/deployments'),
        {
          params: { limit },
        },
      );
      return asArray(response?.data);
    },

  };
};
