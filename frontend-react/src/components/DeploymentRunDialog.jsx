import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import BaseDialog from '@/components/BaseDialog';
import DeploymentParamsForm from '@/components/DeploymentParamsForm';
import { useTheme } from '@mui/material/styles';


const RUN_REASON_OPTIONS = [
  {
    value: 'FAILED',
    label: 'Failed',
    description: 'Previous execution failed and requires immediate follow-up.',
  },
  {
    value: 'INCOMPLETE',
    label: 'Incomplete',
    description: 'Run started but did not complete end-to-end processing.',
  },
  {
    value: 'OTHER',
    label: 'Other',
    description: 'Operational reason that is not covered by existing categories.',
  },
];

export default function DeploymentRunDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  deploymentId = '',
  deploymentName = '',
  parameterSchema = null,
  defaultParameters = {},
}) {
  const theme = useTheme();
  const fieldSx = theme.customStyles.field;
  const [reasonType, setReasonType] = useState(RUN_REASON_OPTIONS[0].value);
  const [reasonText, setReasonText] = useState('');
  const [runParameters, setRunParameters] = useState({});
  const [areParametersValid, setAreParametersValid] = useState(true);

  const hasParameterSchema = useMemo(() => {
    if (!parameterSchema || typeof parameterSchema !== 'object' || Array.isArray(parameterSchema)) {
      return false;
    }
    const properties = parameterSchema.properties;
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
      return false;
    }
    return Object.keys(properties).length > 0;
  }, [parameterSchema]);

  const selectedReasonLabel = RUN_REASON_OPTIONS.find((option) => option.value === reasonType)?.label || 'Unknown';
  const isFormReady = Boolean(reasonType) && areParametersValid;

  useEffect(() => {
    if (!open) {
      setReasonType(RUN_REASON_OPTIONS[0].value);
      setReasonText('');
      setRunParameters({});
      setAreParametersValid(true);
    }
  }, [open]);

  const handleParametersChange = ({ parameters, isValid }) => {
    setRunParameters(parameters && typeof parameters === 'object' ? parameters : {});
    setAreParametersValid(Boolean(isValid));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting || !reasonType || !areParametersValid) {
      return;
    }

    const payload = {
      reasonType,
      reasonText: reasonText.trim(),
    };

    if (hasParameterSchema) {
      payload.parameters = runParameters;
    }

    onSubmit?.({
      ...payload,
    });
  };

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title="Run Deployment"
      subtitle="Manual trigger with required justification"
      icon={PendingActionsOutlinedIcon}
      isSubmitting={isSubmitting}
      actions={
        <>
          <Button
            onClick={onClose}
            color="secondary"
            variant="outlined"
            disabled={isSubmitting}
            sx={{ borderRadius: 999, px: 2 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="deployment-run-form"
            color="primary"
            variant="contained"
            disabled={isSubmitting || !reasonType || !areParametersValid}
            startIcon={<PlayCircleOutlineRoundedIcon />}
            sx={{
              borderRadius: 999,
              px: 2.2,
              background: 'linear-gradient(120deg, rgba(0,203,221,0.85), rgba(143,42,163,0.8))',
              '&:hover': {
                background: 'linear-gradient(120deg, rgba(0,203,221,1), rgba(143,42,163,0.95))',
              },
            }}
          >
            {isSubmitting ? 'Starting...' : 'Run'}
          </Button>
        </>
      }
    >
      <form id="deployment-run-form" onSubmit={handleSubmit}>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Box
            sx={{
              p: 1.6,
              borderRadius: 2,
              border: '1px solid rgba(0, 203, 221, 0.25)',
              background: 'linear-gradient(145deg, rgba(0, 203, 221, 0.14), rgba(143, 42, 163, 0.1))',
            }}
          >
            <Typography variant="subtitle2">
              {deploymentName ? deploymentName : 'Selected deployment'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
              Please explain why this manual run is needed and include enough detail for audit/review.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.1 }}>
              <Chip size="small" label={`Category: ${selectedReasonLabel}`} color="cyberAqua" variant="outlined" />
              <Chip
                size="small"
                label={isFormReady ? 'Ready to run' : 'Form incomplete'}
                color={isFormReady ? 'success' : 'warning'}
                variant="outlined"
              />
            </Box>
          </Box>

          <DeploymentParamsForm
            key={`${open ? 'open' : 'closed'}-${deploymentId || 'none'}`}
            parameterSchema={parameterSchema}
            initialParameters={defaultParameters}
            disabled={isSubmitting}
            fieldSx={fieldSx}
            onChange={handleParametersChange}
          />

          <FormControl fullWidth sx={fieldSx}>
            <InputLabel id="manual-run-reason-type-label">
              Reason Category
            </InputLabel>
            <Select
              labelId="manual-run-reason-type-label"
              name="reasonType"
              value={reasonType}
              label="Reason Category"
              onChange={(event) => setReasonType(event.target.value)}
              disabled={isSubmitting}
            >
              {RUN_REASON_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box>
                    <Typography variant="body2">{option.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            name="reasonText"
            label="Reason"
            value={reasonText}
            onChange={(event) => setReasonText(event.target.value)}
            disabled={isSubmitting}
            multiline
            minRows={4}
            fullWidth
            sx={fieldSx}
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Typography variant="caption" color="text.secondary">
              {reasonText.trim().length} characters
            </Typography>
          </Box>

          {/* <LinearProgress
            variant="determinate"
            value={Math.min(100, reasonText.trim().length)}
            color="success"
            sx={{ height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' }}
          /> */}
        </Box>
      </form>
    </BaseDialog>
  );
}
