import { Chip, Tooltip } from '@mui/material';
import { Deployment } from '@/types/Deployment';
import { formatTimestamp } from '@/utils/formatTimestamp';

type Props = {
  deployment?: Deployment;
  lastRunAt?: string | null;
  showTagsCount?: boolean;
  statusFirst?: boolean;
};

export default function DeploymentMetaChips({
  deployment,
  lastRunAt,
  showTagsCount = false,
  statusFirst = false,
}: Props) {
  const status = deployment?.status || 'UNKNOWN';
  const updatedLabel = formatTimestamp(deployment?.updated || deployment?.created);
  const shouldShowLastRun = lastRunAt !== undefined;
  const lastRunLabel = formatTimestamp(lastRunAt, { emptyValue: 'Never' });
  // const workPoolName = deployment?.work_pool_name || 'No work pool';
  // const workQueueName = deployment?.work_queue_name || '';
  // const tagsCount = Array.isArray(deployment?.tags) ? deployment.tags.length : 0;

  return (
    <>
      {statusFirst ? (
        <>
          <Tooltip title="Deployment status">
            <Chip
              label={status}
              variant="outlined"
              color="cyberMag"
            />
          </Tooltip>
          {deployment?.paused ? (
            <Tooltip title="Deployment paused">
              <Chip
                label="Paused"
                variant="outlined"
                color="warning"
              />
            </Tooltip>
          ) : null}
          <Tooltip title="Last updated">
            <Chip
              label={updatedLabel}
              variant="outlined"
              color="cyberAqua"
            />
          </Tooltip>
          {shouldShowLastRun ? (
            <Tooltip title="Last run">
              <Chip
                label={lastRunLabel}
                variant="outlined"
                color="cyberAqua"
              />
            </Tooltip>
          ) : null}
        </>
      ) : (
        <>
          {/* <Tooltip title="Last updated">
            <Chip
              label={updatedLabel}
              variant="outlined"
              color="cyberAqua"
            />
          </Tooltip> */}
          <Tooltip title="Deployment status">
            <Chip
              label={status}
              variant="outlined"
              color="cyberMag"
            />
          </Tooltip>
          {shouldShowLastRun ? (
            <Tooltip title="Last run">
              <Chip
                label={`${lastRunLabel}`}
                variant="outlined"
                color="cyberAqua"
              />
            </Tooltip>
          ) : null}
          {deployment?.paused ? (
            <Tooltip title="Deployment paused">
              <Chip
                label="Paused"
                variant="outlined"
                color="warning"
              />
            </Tooltip>
          ) : null}
        </>
      )}

      {/* <Tooltip title="Work pool">
        <Chip
          label={workPoolName}
          variant="outlined"
          color="cyberAqua"
        />
      </Tooltip> */}

      {/* {workQueueName ? (
        <Tooltip title="Work queue">
          <Chip
            label={workQueueName}
            variant="outlined"
            color="cyberAqua"
          />
        </Tooltip>
      ) : null} */}

      {/* {showTagsCount ? (
        <Tooltip title="Tags">
          <Chip
            label={`${tagsCount} tags`}
            variant="outlined"
            color="cyberMag"
          />
        </Tooltip>
      ) : null} */}

    </>
  );
}
