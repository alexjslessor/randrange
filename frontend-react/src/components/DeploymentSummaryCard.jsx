import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Tooltip,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import DeploymentActionsMenu from '@/components/DeploymentActionsMenu';
import DeploymentMetaChips from '@/components/DeploymentMetaChips';

const DEFAULT_ACTIONS_SX = {
  mt: -2,
  flexWrap: 'wrap',
  gap: 1,
};

export default function DeploymentSummaryCard({
  deployment,
  onOpenFte,
  canManageFte = false,
  actionsDisabled = false,
  onRun,
  runDisabled = false,
  runLabel = 'Run',
  runTooltip = 'Trigger a run for this deployment',
  lastRunAt,
  showTagsCount = false,
  statusFirst = false,
  titleVariant = 'h6',
  titleLinkToDeployment = false,
  titleComponent = 'div',
  descriptionSx,
  cardSx,
  contentSx,
  actionsSx = DEFAULT_ACTIONS_SX,
}) {
  const deploymentId = deployment?.id;
  const deploymentName = deployment?.name || 'Unnamed deployment';

  return (
    <Card sx={cardSx}>
      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <CardContent sx={contentSx ?? { flex: '1 0 auto' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box sx={{ minWidth: 0, pr: 1 }}>
              {titleLinkToDeployment && deploymentId ? (
                <Typography
                  component={RouterLink}
                  to={`/deployment?id=${deploymentId}`}
                  variant={titleVariant}
                  color="text"
                  sx={{
                    textDecoration: 'none',
                    color: 'inherit',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {deploymentName}
                </Typography>
              ) : (
                <Typography component={titleComponent} variant={titleVariant} color="text">
                  {deploymentName}
                </Typography>
              )}

              {/* <Typography variant="body2" color="text.secondary">
                Flow ID: {deployment?.flow_id || 'Unknown'}
              </Typography> */}
              {deployment?.description ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={[
                    {
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                    },
                    descriptionSx,
                  ]}
                >
                  {deployment.description}
                </Typography>
              ) : null}
            </Box>

            <DeploymentActionsMenu
              onOpenFte={onOpenFte}
              canManageFte={canManageFte}
              disabled={actionsDisabled}
            />
          </Box>
        </CardContent>

        <CardActions sx={actionsSx}>
          <Tooltip title={runTooltip}>
            <span>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                disabled={runDisabled || !onRun}
                onClick={onRun}
              >
                {runLabel}
              </Button>
            </span>
          </Tooltip>

          <DeploymentMetaChips
            deployment={deployment}
            lastRunAt={lastRunAt}
            showTagsCount={showTagsCount}
            statusFirst={statusFirst}
          />
        </CardActions>
      </Box>
    </Card>
  );
}
