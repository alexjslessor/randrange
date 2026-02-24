import {
  Box,
  Button,
  Typography,
} from '@mui/material';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import BaseDialog from './BaseDialog';
import DeploymentFteForm from './DeploymentFteForm';

export default function DeploymentFteDialog({
  open,
  onClose,
  deployment,
  isAdmin = false,
}) {
  const deploymentId = deployment?.id ? String(deployment.id) : '';
  const deploymentName = deployment?.name || '';

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title="Deployment FTE"
      subtitle="Modeling assumptions"
      icon={TuneOutlinedIcon}
      isSubmitting={false}
    >
      <DeploymentFteForm
        deploymentId={deploymentId}
        deploymentName={deploymentName}
        isAdmin={isAdmin}
        onCancel={onClose}
        onSaved={onClose}
      />
    </BaseDialog>
  );
}
