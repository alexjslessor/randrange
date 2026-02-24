import { useMemo } from 'react';
import { useDeployments } from './useDeployments';
import { useFlowRunsFilter } from './useFlowRunsFilter';
import { useFlowRunLateness } from './useFlowRunLateness';
import { useScheduledFlowRuns } from './useScheduledFlowRuns';
import {
  DEFAULT_RISK_WEIGHTS,
  MODEL_QUEUE_ALL,
  addIntervalToHeatmap,
  buildCollisionDrivers,
  computeDurationStats,
  computeLatenessByHour,
  computeRetryStats,
  createHeatmap,
  flattenQueueLateness,
  median,
  pickDuration,
  recommendWindows,
  runtimeKeyFromPercentile,
  safeQueueId,
  safeQueueLabel,
  toChartData,
} from '@/lib/schedulingRiskModel';

const normalizeWeights = (weights) => ({
  concurrency: Math.max(0, Number.isFinite(Number(weights?.concurrency)) ? Number(weights?.concurrency) : DEFAULT_RISK_WEIGHTS.concurrency),
  lateness: Math.max(0, Number.isFinite(Number(weights?.lateness)) ? Number(weights?.lateness) : DEFAULT_RISK_WEIGHTS.lateness),
  retry: Math.max(0, Number.isFinite(Number(weights?.retry)) ? Number(weights?.retry) : DEFAULT_RISK_WEIGHTS.retry),
});

const parseRunStart = (run) => {
  const value = run?.expected_start_time || run?.start_time || run?.next_scheduled_start_time || run?.created;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const groupRunsByDeployment = (runs) => {
  const grouped = {};
  (Array.isArray(runs) ? runs : []).forEach((run) => {
    const deploymentId = String(run?.deployment_id || '').trim();
    if (!deploymentId) return;
    if (!grouped[deploymentId]) grouped[deploymentId] = [];
    grouped[deploymentId].push(run);
  });
  return grouped;
};

const summarizeHeatmap = (heatmap) => {
  const values = (heatmap || []).flat();
  if (!values.length) {
    return {
      maxRisk: 0,
      avgRisk: 0,
    };
  }

  const maxRisk = Math.max(...values);
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    maxRisk,
    avgRisk: total / values.length,
  };
};

const useSchedulingModel = ({
  horizonDays = 7,
  lookbackDays = 30,
  runtimePercentile = 95,
  bufferSeconds = 120,
  bucketMinutes = 15,
  stepMinutes = 15,
  topN = 12,
  riskWeights = DEFAULT_RISK_WEIGHTS,
  selectedDeploymentId = '',
  selectedQueueId = '',
} = {}) => {
  const weights = normalizeWeights(riskWeights);
  const runtimePercentileKey = runtimeKeyFromPercentile(runtimePercentile);

  const deploymentsQuery = useDeployments({
    page: 1,
    limit: 200,
    sort: 'NAME_ASC',
  });

  const deployments = useMemo(
    () => (Array.isArray(deploymentsQuery.data?.results) ? deploymentsQuery.data.results : []),
    [deploymentsQuery.data],
  );

  const deploymentIds = useMemo(
    () => deployments.map((deployment) => String(deployment?.id || '').trim()).filter(Boolean),
    [deployments],
  );

  const scheduledFlowRunsQuery = useScheduledFlowRuns({
    deploymentIds,
    horizonDays,
    limit: 200,
    enabled: deploymentIds.length > 0,
  });

  const flowRunsQuery = useFlowRunsFilter({
    deploymentIds,
    lookbackDays,
    limit: 200,
    enabled: deploymentIds.length > 0,
  });

  const latenessQuery = useFlowRunLateness({
    deploymentIds,
    lookbackDays,
    enabled: deploymentIds.length > 0,
  });

  const model = useMemo(() => {
    const deploymentMap = {};
    const queueMeta = {};
    const statsByDeployment = {};

    deployments.forEach((deployment) => {
      const deploymentId = String(deployment?.id || '').trim();
      if (!deploymentId) return;

      deploymentMap[deploymentId] = deployment;
      const queueId = safeQueueId(deployment);
      if (!queueMeta[queueId]) {
        queueMeta[queueId] = {
          id: queueId,
          label: safeQueueLabel(deployment),
          deploymentCount: 0,
        };
      }
      queueMeta[queueId].deploymentCount += 1;
    });

    const runsByDeployment = groupRunsByDeployment(flowRunsQuery.data);
    const queueLatenessSeeds = {};
    const queueRetrySeeds = {};
    const fallbackDurationSamples = [];

    Object.keys(deploymentMap).forEach((deploymentId) => {
      const deployment = deploymentMap[deploymentId];
      const queueId = safeQueueId(deployment);
      const runs = runsByDeployment[deploymentId] || [];
      const duration = computeDurationStats(runs);
      const retry = computeRetryStats(runs);
      const latenessByHour = computeLatenessByHour(runs);
      const historyWeight = Math.max(1, runs.length);

      if (!queueLatenessSeeds[queueId]) {
        queueLatenessSeeds[queueId] = [];
      }
      queueLatenessSeeds[queueId].push({
        latenessByHour,
        weight: historyWeight,
      });

      if (!queueRetrySeeds[queueId]) {
        queueRetrySeeds[queueId] = [];
      }
      queueRetrySeeds[queueId].push({
        retryAmplification: Math.max(0, retry.avgAttempts - 1),
        weight: historyWeight,
      });

      fallbackDurationSamples.push(duration[runtimePercentileKey]);

      statsByDeployment[deploymentId] = {
        deploymentId,
        deploymentName: deployment?.name || deploymentId,
        queueId,
        queueLabel: safeQueueLabel(deployment),
        historyCount: runs.length,
        duration,
        retry,
        latenessByHour,
      };
    });

    const fallbackDurationSeconds = median(
      fallbackDurationSamples
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0),
    );

    const queueLatenessByHour = {};
    const queueRetryAmplification = {};

    Object.keys(queueMeta).forEach((queueId) => {
      queueLatenessByHour[queueId] = flattenQueueLateness(queueLatenessSeeds[queueId] || []);
      const retryEntries = queueRetrySeeds[queueId] || [];
      const totalWeight = retryEntries.reduce((sum, item) => sum + item.weight, 0);
      if (totalWeight <= 0) {
        queueRetryAmplification[queueId] = 0;
      } else {
        const weightedRetry = retryEntries.reduce(
          (sum, item) => sum + item.retryAmplification * item.weight,
          0,
        );
        queueRetryAmplification[queueId] = weightedRetry / totalWeight;
      }
    });

    const riskHeatmapsByQueue = {};
    const concurrencyHeatmapsByQueue = {};
    Object.keys(queueMeta).forEach((queueId) => {
      riskHeatmapsByQueue[queueId] = createHeatmap(bucketMinutes);
      concurrencyHeatmapsByQueue[queueId] = createHeatmap(bucketMinutes);
    });

    const globalRiskHeatmap = createHeatmap(bucketMinutes);
    const globalConcurrencyHeatmap = createHeatmap(bucketMinutes);

    const intervalRecords = [];

    (Array.isArray(scheduledFlowRunsQuery.data) ? scheduledFlowRunsQuery.data : []).forEach((run) => {
      const deploymentId = String(run?.deployment_id || '').trim();
      if (!deploymentId) return;
      const deployment = deploymentMap[deploymentId];
      if (!deployment) return;

      const queueId = safeQueueId(deployment);
      if (!riskHeatmapsByQueue[queueId]) {
        riskHeatmapsByQueue[queueId] = createHeatmap(bucketMinutes);
        concurrencyHeatmapsByQueue[queueId] = createHeatmap(bucketMinutes);
        queueMeta[queueId] = {
          id: queueId,
          label: safeQueueLabel(deployment),
          deploymentCount: 0,
        };
      }

      const start = parseRunStart(run);
      if (!start) return;

      const stats = statsByDeployment[deploymentId];
      const durationSeconds = stats
        ? pickDuration(stats, runtimePercentile)
        : fallbackDurationSeconds;

      const hour = start.getHours();
      const latenessByHour = stats?.latenessByHour || queueLatenessByHour[queueId] || Array.from({ length: 24 }, () => 0);
      const latenessMinutes = Number(latenessByHour[hour] || 0);
      const retryAmplification = Math.max(0, Number(stats?.retry?.avgAttempts || 1) - 1);

      const effectiveWeight = weights.concurrency + weights.lateness * latenessMinutes + weights.retry * retryAmplification;
      const end = new Date(start.getTime() + (durationSeconds + bufferSeconds) * 1000);

      addIntervalToHeatmap(riskHeatmapsByQueue[queueId], start, end, bucketMinutes, effectiveWeight);
      addIntervalToHeatmap(concurrencyHeatmapsByQueue[queueId], start, end, bucketMinutes, 1);

      addIntervalToHeatmap(globalRiskHeatmap, start, end, bucketMinutes, effectiveWeight);
      addIntervalToHeatmap(globalConcurrencyHeatmap, start, end, bucketMinutes, 1);

      intervalRecords.push({
        deploymentId,
        queueId,
        startMs: start.getTime(),
        endMs: end.getTime(),
        weight: effectiveWeight,
      });
    });

    const queueOptions = [
      {
        id: MODEL_QUEUE_ALL,
        label: 'All Queues',
      },
      ...Object.values(queueMeta)
        .sort((left, right) => left.label.localeCompare(right.label))
        .map((queue) => ({
          id: queue.id,
          label: queue.label,
        })),
    ];

    const selectedDeploymentQueueId = selectedDeploymentId && deploymentMap[selectedDeploymentId]
      ? safeQueueId(deploymentMap[selectedDeploymentId])
      : '';

    const activeQueueId = selectedQueueId && queueOptions.some((queue) => queue.id === selectedQueueId)
      ? selectedQueueId
      : selectedDeploymentQueueId || MODEL_QUEUE_ALL;

    const activeRiskHeatmap = activeQueueId === MODEL_QUEUE_ALL
      ? globalRiskHeatmap
      : riskHeatmapsByQueue[activeQueueId] || createHeatmap(bucketMinutes);
    const activeConcurrencyHeatmap = activeQueueId === MODEL_QUEUE_ALL
      ? globalConcurrencyHeatmap
      : concurrencyHeatmapsByQueue[activeQueueId] || createHeatmap(bucketMinutes);

    const allQueueLatenessSources = Object.keys(queueLatenessByHour).map((queueId) => ({
      latenessByHour: queueLatenessByHour[queueId],
      weight: 1,
    }));

    const activeLatenessByHour = activeQueueId === MODEL_QUEUE_ALL
      ? flattenQueueLateness(allQueueLatenessSources)
      : queueLatenessByHour[activeQueueId] || Array.from({ length: 24 }, () => 0);

    const activeRetryAmplification = activeQueueId === MODEL_QUEUE_ALL
      ? Object.values(queueRetryAmplification).reduce((sum, value) => sum + value, 0) /
        Math.max(1, Object.keys(queueRetryAmplification).length)
      : Number(queueRetryAmplification[activeQueueId] || 0);

    const selectedStats = selectedDeploymentId ? statsByDeployment[selectedDeploymentId] : null;
    const recommendationRunSeconds = (selectedStats
      ? pickDuration(selectedStats, runtimePercentile)
      : fallbackDurationSeconds) + bufferSeconds;

    const recommendations = recommendWindows({
      riskHeatmap: activeRiskHeatmap,
      concurrencyHeatmap: activeConcurrencyHeatmap,
      bucketMinutes,
      runSeconds: recommendationRunSeconds,
      stepMinutes,
      topN,
      riskWeights: weights,
      latenessByHour: activeLatenessByHour,
      queueRetryAmplification: activeRetryAmplification,
      queueId: activeQueueId,
    });

    const recommendationsByQueue = {};
    Object.keys(riskHeatmapsByQueue).forEach((queueId) => {
      const queueRunSeconds = recommendationRunSeconds;
      recommendationsByQueue[queueId] = recommendWindows({
        riskHeatmap: riskHeatmapsByQueue[queueId],
        concurrencyHeatmap: concurrencyHeatmapsByQueue[queueId],
        bucketMinutes,
        runSeconds: queueRunSeconds,
        stepMinutes,
        topN,
        riskWeights: weights,
        latenessByHour: queueLatenessByHour[queueId] || Array.from({ length: 24 }, () => 0),
        queueRetryAmplification: Number(queueRetryAmplification[queueId] || 0),
        queueId,
      });
    });

    const collisionDrivers = buildCollisionDrivers({
      selectedDeploymentId,
      intervals: intervalRecords,
      deploymentMap,
    });

    const queueSummaries = [
      {
        queueId: MODEL_QUEUE_ALL,
        queueLabel: 'All Queues',
        ...summarizeHeatmap(globalRiskHeatmap),
      },
      ...Object.keys(riskHeatmapsByQueue).map((queueId) => ({
        queueId,
        queueLabel: queueMeta[queueId]?.label || queueId,
        ...summarizeHeatmap(riskHeatmapsByQueue[queueId]),
      })),
    ];

    const heatmapsByQueue = {};
    const concurrencyByQueue = {};
    Object.keys(riskHeatmapsByQueue).forEach((queueId) => {
      heatmapsByQueue[queueId] = toChartData(riskHeatmapsByQueue[queueId], bucketMinutes);
      concurrencyByQueue[queueId] = toChartData(concurrencyHeatmapsByQueue[queueId], bucketMinutes);
    });

    return {
      deployments,
      deploymentMap,
      statsByDeployment,
      queueOptions,
      queueSummaries,
      activeQueueId,
      heatmap: toChartData(activeRiskHeatmap, bucketMinutes),
      concurrencyHeatmap: toChartData(activeConcurrencyHeatmap, bucketMinutes),
      heatmapsByQueue,
      concurrencyByQueue,
      recommendations,
      recommendationsByQueue,
      collisionDrivers,
      fallbackDurationSeconds,
      recommendationRunSeconds,
      runtimePercentileKey,
      weights,
    };
  }, [
    deployments,
    flowRunsQuery.data,
    scheduledFlowRunsQuery.data,
    runtimePercentile,
    runtimePercentileKey,
    bucketMinutes,
    bufferSeconds,
    stepMinutes,
    topN,
    weights,
    selectedDeploymentId,
    selectedQueueId,
  ]);

  const isLoading = deploymentsQuery.isLoading || scheduledFlowRunsQuery.isLoading || flowRunsQuery.isLoading || latenessQuery.isLoading;
  const isFetching = deploymentsQuery.isFetching || scheduledFlowRunsQuery.isFetching || flowRunsQuery.isFetching || latenessQuery.isFetching;
  const isError = deploymentsQuery.isError || scheduledFlowRunsQuery.isError || flowRunsQuery.isError || latenessQuery.isError;
  const error = deploymentsQuery.error || scheduledFlowRunsQuery.error || flowRunsQuery.error || latenessQuery.error;

  return {
    ...model,
    averageLatenessSeconds: latenessQuery.data,
    isLoading,
    isFetching,
    isError,
    error,
  };
};

export {
  useSchedulingModel,
};
