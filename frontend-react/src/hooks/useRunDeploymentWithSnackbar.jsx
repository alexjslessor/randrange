import { useCallback } from 'react';
import { useDeploymentRun } from './useDeploymentRun';
import { useSnackbar } from '@/context';
import { getApiErrorMessage } from '@/utils/apiError';
import { buildDeploymentRunBody } from '@/utils/deploymentRunPayload';

const resolveFlowRunId = (result) => (
  result?.id
  || result?.flow_run_id
  || result?.flow_run?.id
  || null
);

const useRunDeploymentWithSnackbar = () => {
  const { showSnackbar } = useSnackbar();
  const {
    mutate: runDeployment,
    isPending,
  } = useDeploymentRun();

  const runDeploymentWithFeedback = useCallback(
    ({
      deploymentId,
      deploymentName = 'deployment',
      formData = {},
      onSuccess,
      onError,
      onSettled,
    }) => {
      if (!deploymentId) return;
      const body = buildDeploymentRunBody(formData);

      runDeployment(
        {
          id: deploymentId,
          body,
        },
        {
          onSuccess: (result, variables, context) => {
            const flowRunId = resolveFlowRunId(result);
            showSnackbar(
              flowRunId
                ? `Run submitted for ${deploymentName}. Flow run id: ${flowRunId}`
                : `Run submitted for ${deploymentName}.`,
              {
                severity: 'success',
                title: 'Run Submitted',
              },
            );
            onSuccess?.(result, variables, context);
          },
          onError: (error, variables, context) => {
            showSnackbar(
              getApiErrorMessage(error, `Failed to submit run for ${deploymentName}.`),
              {
                severity: 'error',
                title: 'Run Submission Failed',
                autoHideDuration: 7000,
              },
            );
            onError?.(error, variables, context);
          },
          onSettled: (result, error, variables, context) => {
            onSettled?.(result, error, variables, context);
          },
        },
      );
    },
    [runDeployment, showSnackbar],
  );

  return {
    runDeploymentWithFeedback,
    isRunPending: isPending,
  };
};

export { useRunDeploymentWithSnackbar };
