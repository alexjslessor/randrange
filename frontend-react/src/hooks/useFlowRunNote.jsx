import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAxios } from './useAxios';
import { buildAuthUrl } from '@/api/httpClient';

const fetchFlowRunNote = async (axiosInstance, flowRunId) => {
  if (!flowRunId) {
    return null;
  }

  const response = await axiosInstance.get(
    buildAuthUrl(`/metadata/flow_runs/${flowRunId}/note`),
  );
  return response?.data ?? null;
};

const upsertFlowRunNote = async (
  axiosInstance,
  {
    flowRunId,
    noteText,
  },
) => {
  if (!flowRunId) {
    throw new Error('Flow run id is required');
  }

  const response = await axiosInstance.put(
    buildAuthUrl(`/metadata/flow_runs/${flowRunId}/note`),
    {
      note_text: noteText,
    },
  );
  return response?.data ?? null;
};

const useFlowRunNote = (
  flowRunId,
  { enabled = true } = {},
) => {
  const axiosInstance = useAxios();

  return useQuery({
    queryKey: ['flow-run-note', flowRunId],
    queryFn: () => fetchFlowRunNote(axiosInstance, flowRunId),
    enabled: Boolean(flowRunId) && enabled,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });
};

const useUpsertFlowRunNote = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => upsertFlowRunNote(axiosInstance, payload),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['flow-run-note', variables?.flowRunId], data);
      queryClient.invalidateQueries({
        queryKey: ['deployment-runs'],
      });
    },
  });
};

export {
  fetchFlowRunNote,
  upsertFlowRunNote,
  useFlowRunNote,
  useUpsertFlowRunNote,
};
