import { buildAuthUrl, httpClientPrivate } from './httpClient';

type Dict = Record<string, unknown>;

export type FteSummaryWindow = 'today' | 'week' | 'month' | 'year' | 'all';

export type DeploymentFteUpsertRequest = {
  avg_human_minutes_per_case: number;
  avg_cases_per_run?: number | null;
  analyst_hourly_cost: number;
  fte_hours_per_year?: number;
  confidence_level?: string | null;
  description?: string | null;
  notes?: string | null;
  is_active?: boolean;
  extra_metadata?: Dict;
};

export type DeploymentFteView = {
  id: string;
  deployment_id: string;
  avg_human_minutes_per_case: number;
  avg_cases_per_run: number | null;
  analyst_hourly_cost: number;
  fte_hours_per_year: number;
  confidence_level: string | null;
  description: string | null;
  notes: string | null;
  is_active: boolean;
  extra_metadata: Dict;
  created_at: string;
  updated_at: string;
};

export type DeploymentFteSummaryRow = {
  deployment_id: string;
  deployment_name: string | null;
  runs_completed: number;
  human_time_per_run_minutes: number | null;
  avg_bot_time_minutes: number | null;
  total_hours_saved: number | null;
  fte_saved: number | null;
  est_cost_avoided: number | null;
};

export type FlowRunNoteUpsertRequest = {
  note_text: string;
};

export type FlowRunNoteView = {
  id: string;
  flow_run_id: string;
  deployment_id: string;
  note_text: string;
  updated_by_user_id: string | null;
  updated_by_username: string | null;
  created_at: string;
  updated_at: string;
};

export const metadataApi = (axiosInstance = httpClientPrivate) => {
  return {
    getDeploymentFte: async (
      deploymentId: string,
    ): Promise<DeploymentFteView | null> => {
      if (!deploymentId) {
        return null;
      }
      const response = await axiosInstance.get(
        buildAuthUrl(`/metadata/deployments/${deploymentId}/fte`),
      );
      return (response?.data ?? null) as DeploymentFteView | null;
    },

    upsertDeploymentFte: async (
      deploymentId: string,
      payload: DeploymentFteUpsertRequest,
    ): Promise<DeploymentFteView> => {
      if (!deploymentId) {
        throw new Error('Deployment id is required');
      }
      const response = await axiosInstance.put(
        buildAuthUrl(`/metadata/deployments/${deploymentId}/fte`),
        payload,
      );
      return response.data as DeploymentFteView;
    },

    getFteSummary: async (
      window: FteSummaryWindow = 'month',
    ): Promise<DeploymentFteSummaryRow[]> => {
      const response = await axiosInstance.get(
        buildAuthUrl('/metadata/fte/summary'),
        {
          params: { window },
        },
      );
      return Array.isArray(response?.data)
        ? (response.data as DeploymentFteSummaryRow[])
        : [];
    },

    getFlowRunNote: async (flowRunId: string): Promise<FlowRunNoteView | null> => {
      if (!flowRunId) {
        return null;
      }
      const response = await axiosInstance.get(
        buildAuthUrl(`/metadata/flow_runs/${flowRunId}/note`),
      );
      return (response?.data ?? null) as FlowRunNoteView | null;
    },

    upsertFlowRunNote: async (
      flowRunId: string,
      payload: FlowRunNoteUpsertRequest,
    ): Promise<FlowRunNoteView> => {
      if (!flowRunId) {
        throw new Error('Flow run id is required');
      }
      const response = await axiosInstance.put(
        buildAuthUrl(`/metadata/flow_runs/${flowRunId}/note`),
        payload,
      );
      return response.data as FlowRunNoteView;
    },
  };
};
