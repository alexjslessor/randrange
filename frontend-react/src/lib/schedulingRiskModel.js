const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DEFAULT_DURATION_SECONDS = 300;
const MODEL_QUEUE_ALL = '__all__';

const DEFAULT_RISK_WEIGHTS = {
  concurrency: 1.0,
  lateness: 0.04,
  retry: 0.6,
};

const percentileOfSorted = (sortedValues, percentile) => {
  if (!sortedValues.length) {
    return DEFAULT_DURATION_SECONDS;
  }

  if (sortedValues.length === 1) {
    return sortedValues[0];
  }

  const clamped = Math.min(1, Math.max(0, percentile));
  const index = Math.floor(clamped * (sortedValues.length - 1));
  return sortedValues[index];
};

const asNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const safeQueueId = (deployment) =>
  deployment?.work_queue_id ||
  deployment?.work_queue_name ||
  deployment?.work_pool_name ||
  'unassigned';

const safeQueueLabel = (deployment) =>
  deployment?.work_queue_name ||
  deployment?.work_queue_id ||
  deployment?.work_pool_name ||
  'Unassigned';

const computeDurationSeconds = (run) => {
  const totalRunTime = asNumber(run?.total_run_time);
  if (totalRunTime > 0) {
    return totalRunTime;
  }

  const estimatedRunTime = asNumber(run?.estimated_run_time);
  const start = toDate(run?.start_time);
  const end = toDate(run?.end_time);

  if (start && end && end.getTime() > start.getTime()) {
    return Math.max((end.getTime() - start.getTime()) / 1000, estimatedRunTime, 1);
  }

  if (estimatedRunTime > 0) {
    return estimatedRunTime;
  }

  return 0;
};

const computeDurationStats = (runs) => {
  const durations = (Array.isArray(runs) ? runs : [])
    .map((run) => computeDurationSeconds(run))
    .filter((value) => value > 0)
    .sort((left, right) => left - right);

  if (!durations.length) {
    return {
      p50: DEFAULT_DURATION_SECONDS,
      p90: DEFAULT_DURATION_SECONDS,
      p95: DEFAULT_DURATION_SECONDS,
      sampleSize: 0,
    };
  }

  return {
    p50: percentileOfSorted(durations, 0.5),
    p90: percentileOfSorted(durations, 0.9),
    p95: percentileOfSorted(durations, 0.95),
    sampleSize: durations.length,
  };
};

const computeRetryStats = (runs) => {
  const attempts = (Array.isArray(runs) ? runs : [])
    .map((run) => {
      const count = asNumber(run?.run_count);
      return count > 0 ? count : 1;
    })
    .filter((count) => count > 0);

  if (!attempts.length) {
    return {
      avgAttempts: 1,
    };
  }

  const totalAttempts = attempts.reduce((sum, value) => sum + value, 0);
  return {
    avgAttempts: totalAttempts / attempts.length,
  };
};

const computeLatenessByHour = (runs) => {
  const buckets = Array.from({ length: 24 }, () => []);

  (Array.isArray(runs) ? runs : []).forEach((run) => {
    const expected = toDate(run?.expected_start_time);
    const actualStart = toDate(run?.start_time);

    if (!expected || !actualStart) return;

    const latenessMinutes = Math.max(0, (actualStart.getTime() - expected.getTime()) / 60000);
    const hour = expected.getHours();
    if (!Number.isFinite(latenessMinutes) || hour < 0 || hour > 23) return;
    buckets[hour].push(latenessMinutes);
  });

  return buckets.map((hourBucket) => {
    if (!hourBucket.length) return 0;
    hourBucket.sort((left, right) => left - right);
    return percentileOfSorted(hourBucket, 0.9);
  });
};

const minuteLabel = (totalMinutes) => {
  const minutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hoursPart = String(Math.floor(minutes / 60)).padStart(2, '0');
  const minutesPart = String(minutes % 60).padStart(2, '0');
  return `${hoursPart}:${minutesPart}`;
};

const createHeatmap = (bucketMinutes) => {
  const bucketsPerDay = Math.max(1, Math.floor((24 * 60) / bucketMinutes));
  return Array.from({ length: 7 }, () => Array.from({ length: bucketsPerDay }, () => 0));
};

const dayIndexMon0 = (date) => (date.getDay() + 6) % 7;

const bucketIndex = (date, bucketMinutes, bucketsPerDay) => {
  const minuteOfDay = date.getHours() * 60 + date.getMinutes();
  const raw = Math.floor(minuteOfDay / bucketMinutes);
  return Math.max(0, Math.min(bucketsPerDay - 1, raw));
};

const addIntervalToHeatmap = (heatmap, start, end, bucketMinutes, weight) => {
  if (!start || !end) return;
  if (!(start instanceof Date) || !(end instanceof Date)) return;
  const startMs = start.getTime();
  const endMs = end.getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return;

  const bucketsPerDay = heatmap?.[0]?.length ?? 0;
  if (!bucketsPerDay) return;

  const stepMs = bucketMinutes * 60 * 1000;
  const maxSteps = Math.max(1, Math.ceil((endMs - startMs) / stepMs));

  for (let step = 0; step < maxSteps; step += 1) {
    const cursor = new Date(startMs + step * stepMs);
    if (cursor.getTime() >= endMs) break;
    const day = dayIndexMon0(cursor);
    const bucket = bucketIndex(cursor, bucketMinutes, bucketsPerDay);
    heatmap[day][bucket] += weight;
  }
};

const toChartData = (heatmap, bucketMinutes) => {
  const bucketsPerDay = heatmap?.[0]?.length ?? 0;
  const x = Array.from({ length: bucketsPerDay }, (_, index) => minuteLabel(index * bucketMinutes));
  return {
    x,
    y: [...DAY_LABELS],
    z: heatmap,
  };
};

const runtimeKeyFromPercentile = (runtimePercentile) => {
  if (runtimePercentile >= 95 || runtimePercentile === 'p95') return 'p95';
  if (runtimePercentile >= 90 || runtimePercentile === 'p90') return 'p90';
  return 'p50';
};

const pickDuration = (stats, runtimePercentile) => {
  const key = runtimeKeyFromPercentile(runtimePercentile);
  const duration = asNumber(stats?.duration?.[key]);
  return duration > 0 ? duration : DEFAULT_DURATION_SECONDS;
};

const median = (values) => {
  if (!values.length) return DEFAULT_DURATION_SECONDS;
  const sorted = [...values].sort((left, right) => left - right);
  return percentileOfSorted(sorted, 0.5);
};

const flattenQueueLateness = (entries) => {
  if (!entries.length) {
    return Array.from({ length: 24 }, () => 0);
  }

  const totals = Array.from({ length: 24 }, () => 0);
  const weights = Array.from({ length: 24 }, () => 0);

  entries.forEach(({ latenessByHour, weight }) => {
    latenessByHour.forEach((value, hour) => {
      totals[hour] += value * weight;
      weights[hour] += weight;
    });
  });

  return totals.map((total, hour) => (weights[hour] > 0 ? total / weights[hour] : 0));
};

const recommendationSort = (left, right) => {
  if (left.riskScore !== right.riskScore) return left.riskScore - right.riskScore;
  if (left.peakConcurrency !== right.peakConcurrency) {
    return left.peakConcurrency - right.peakConcurrency;
  }
  if (left.dayIndex !== right.dayIndex) return left.dayIndex - right.dayIndex;
  return left.startMinute - right.startMinute;
};

const recommendWindows = ({
  riskHeatmap,
  concurrencyHeatmap,
  bucketMinutes,
  runSeconds,
  stepMinutes,
  topN,
  riskWeights,
  latenessByHour,
  queueRetryAmplification,
  queueId,
}) => {
  const bucketsPerDay = riskHeatmap?.[0]?.length ?? 0;
  if (!bucketsPerDay) return [];

  const totalBuckets = bucketsPerDay * 7;
  const windowBuckets = Math.max(1, Math.ceil(runSeconds / (bucketMinutes * 60)));
  const stepBuckets = Math.max(1, Math.floor(stepMinutes / bucketMinutes));

  const candidates = [];

  for (let start = 0; start < totalBuckets; start += stepBuckets) {
    let peakRisk = 0;
    let peakConcurrency = 0;
    let sumRisk = 0;
    let sumConcurrency = 0;

    for (let offset = 0; offset < windowBuckets; offset += 1) {
      const index = (start + offset) % totalBuckets;
      const day = Math.floor(index / bucketsPerDay);
      const bucket = index % bucketsPerDay;
      const riskValue = asNumber(riskHeatmap?.[day]?.[bucket]);
      const concurrencyValue = asNumber(concurrencyHeatmap?.[day]?.[bucket]);

      peakRisk = Math.max(peakRisk, riskValue);
      peakConcurrency = Math.max(peakConcurrency, concurrencyValue);
      sumRisk += riskValue;
      sumConcurrency += concurrencyValue;
    }

    const avgRisk = sumRisk / windowBuckets;
    const avgConcurrency = sumConcurrency / windowBuckets;

    const dayIndex = Math.floor(start / bucketsPerDay);
    const startBucket = start % bucketsPerDay;
    const startMinute = startBucket * bucketMinutes;
    const startHour = Math.floor(startMinute / 60);

    const latenessPenalty = riskWeights.lateness * asNumber(latenessByHour?.[startHour]);
    const retryPenalty = riskWeights.retry * asNumber(queueRetryAmplification);

    const riskScore = peakRisk + avgRisk * 0.35 + peakConcurrency * 0.2 + avgConcurrency * 0.1 + latenessPenalty + retryPenalty;

    candidates.push({
      queueId,
      dayIndex,
      day: DAY_LABELS[dayIndex],
      startMinute,
      time: minuteLabel(startMinute),
      riskScore,
      peakRisk,
      avgRisk,
      peakConcurrency,
      avgConcurrency,
      latenessPenaltyMinutes: asNumber(latenessByHour?.[startHour]),
      retryPenaltyAttempts: asNumber(queueRetryAmplification),
    });
  }

  candidates.sort(recommendationSort);

  return candidates.slice(0, topN).map((candidate, index) => ({
    rank: index + 1,
    ...candidate,
    reason: `Peak ${candidate.peakConcurrency.toFixed(1)} overlap; p90 lateness penalty ${candidate.latenessPenaltyMinutes.toFixed(1)}m`,
  }));
};

const buildCollisionDrivers = ({
  selectedDeploymentId,
  intervals,
  deploymentMap,
}) => {
  if (!selectedDeploymentId) return [];

  const targetIntervals = intervals.filter((interval) => interval.deploymentId === selectedDeploymentId);
  if (!targetIntervals.length) return [];

  const grouped = {};

  targetIntervals.forEach((targetInterval) => {
    intervals.forEach((otherInterval) => {
      if (otherInterval.deploymentId === selectedDeploymentId) return;
      if (otherInterval.queueId !== targetInterval.queueId) return;

      const overlapMs = Math.min(targetInterval.endMs, otherInterval.endMs) - Math.max(targetInterval.startMs, otherInterval.startMs);
      if (overlapMs <= 0) return;

      const key = otherInterval.deploymentId;
      if (!grouped[key]) {
        const deployment = deploymentMap[key];
        grouped[key] = {
          deploymentId: key,
          deploymentName: deployment?.name || key,
          queueId: otherInterval.queueId,
          overlapMinutes: 0,
          collisions: 0,
          maxOverlapMinutes: 0,
          maxRiskWeight: 0,
        };
      }

      const overlapMinutes = overlapMs / 60000;
      grouped[key].overlapMinutes += overlapMinutes;
      grouped[key].collisions += 1;
      grouped[key].maxOverlapMinutes = Math.max(grouped[key].maxOverlapMinutes, overlapMinutes);
      grouped[key].maxRiskWeight = Math.max(grouped[key].maxRiskWeight, otherInterval.weight);
    });
  });

  return Object.values(grouped)
    .sort((left, right) => right.overlapMinutes - left.overlapMinutes)
    .slice(0, 15)
    .map((driver) => ({
      ...driver,
      averageOverlapMinutes: driver.collisions > 0 ? driver.overlapMinutes / driver.collisions : 0,
      reason: `Tail-duration overlap on queue ${driver.queueId}`,
    }));
};

export {
  DAY_LABELS,
  DEFAULT_RISK_WEIGHTS,
  MODEL_QUEUE_ALL,
  computeDurationStats,
  computeRetryStats,
  computeLatenessByHour,
  createHeatmap,
  addIntervalToHeatmap,
  runtimeKeyFromPercentile,
  toChartData,
  minuteLabel,
  safeQueueId,
  safeQueueLabel,
  recommendWindows,
  buildCollisionDrivers,
  pickDuration,
  median,
  flattenQueueLateness,
};
