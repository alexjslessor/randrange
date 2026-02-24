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
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { useDeploymentFte, useSaveDeploymentFte } from '@/hooks/useDeploymentFte';
import { DeploymentFteConfidenceLevel } from '@/types/DeploymentFte';
import { getApiErrorMessage } from '@/utils/apiError';
import { useTheme } from '@mui/material/styles';

const DEFAULT_FTE_HOURS_PER_YEAR = 2080;
const CONFIDENCE_OPTIONS = Object.values(DeploymentFteConfidenceLevel);
const formatNumber = (value, digits = 2) => Number(value).toLocaleString(undefined, {
  maximumFractionDigits: digits,
  minimumFractionDigits: 0,
});

const buildFormState = (source) => ({
  avgHumanMinutesPerCase: source?.avg_human_minutes_per_case?.toString() ?? '',
  avgCasesPerRun: source?.avg_cases_per_run?.toString() ?? '',
  analystHourlyCost: source?.analyst_hourly_cost?.toString() ?? '',
  fteHoursPerYear: source?.fte_hours_per_year?.toString() ?? String(DEFAULT_FTE_HOURS_PER_YEAR),
  confidenceLevel: source?.confidence_level ?? '',
  description: source?.description ?? '',
  notes: source?.notes ?? '',
  isActive: source?.is_active ?? true,
});

const parseOptionalNumber = (value) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const parseRequiredNumber = (value) => {
  const parsed = parseOptionalNumber(value);
  return parsed === null ? Number.NaN : parsed;
};

export default function DeploymentFteForm({
  deploymentId,
  deploymentName = '',
  isAdmin = false,
  onCancel,
  onSaved,
}) {
  const theme = useTheme();
  const fieldSx = theme.customStyles.field;
  const sectionCardSx = theme.customStyles.dashboard.dialog.sectionCard;
  const helpBadgeSx = theme.customStyles.dashboard.dialog.helpBadge;
  const {
    data: fteConfig,
    isLoading,
    isError,
    error,
  } = useDeploymentFte(deploymentId, { enabled: Boolean(deploymentId) });
  const {
    mutateAsync: saveDeploymentFte,
    isPending: isSavePending,
    isError: isSaveError,
    error: saveError,
  } = useSaveDeploymentFte();

  const [formState, setFormState] = useState(buildFormState(null));
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    setFormState(buildFormState(fteConfig));
    setSubmitError('');
  }, [deploymentId, fteConfig]);

  const validation = useMemo(() => {
    const avgHumanMinutesPerCase = parseRequiredNumber(formState.avgHumanMinutesPerCase);
    const analystHourlyCost = parseRequiredNumber(formState.analystHourlyCost);
    const fteHoursPerYear = parseRequiredNumber(formState.fteHoursPerYear);
    const avgCasesPerRun = parseOptionalNumber(formState.avgCasesPerRun);

    return {
      avgHumanMinutesPerCaseError: !Number.isFinite(avgHumanMinutesPerCase) || avgHumanMinutesPerCase <= 0,
      analystHourlyCostError: !Number.isFinite(analystHourlyCost) || analystHourlyCost < 0,
      fteHoursPerYearError: !Number.isFinite(fteHoursPerYear) || fteHoursPerYear <= 0,
      avgCasesPerRunError: String(formState.avgCasesPerRun ?? '').trim() !== '' && (
        !Number.isFinite(avgCasesPerRun) || avgCasesPerRun <= 0
      ),
    };
  }, [formState]);

  const hasValidationErrors = Object.values(validation).some(Boolean);
  const isSubmitDisabled = !deploymentId || !isAdmin || isSavePending || hasValidationErrors;
  const avgHumanMinutesPerCase = parseOptionalNumber(formState.avgHumanMinutesPerCase);
  const avgCasesPerRun = parseOptionalNumber(formState.avgCasesPerRun);
  const analystHourlyCost = parseOptionalNumber(formState.analystHourlyCost);
  const estimatedHoursPerRun = (
    Number.isFinite(avgHumanMinutesPerCase)
    && Number.isFinite(avgCasesPerRun)
  )
    ? (Number(avgHumanMinutesPerCase) * Number(avgCasesPerRun)) / 60
    : null;
  const estimatedCostPerRun = (
    Number.isFinite(estimatedHoursPerRun)
    && Number.isFinite(analystHourlyCost)
  )
    ? Number(estimatedHoursPerRun) * Number(analystHourlyCost)
    : null;

  const updateField = (field) => (event) => {
    setFormState((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleToggleIsActive = (event) => {
    const checked = event.target.value === 'true';
    setFormState((current) => ({
      ...current,
      isActive: checked,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitDisabled) {
      return;
    }

    setSubmitError('');
    try {
      const payload = {
        avg_human_minutes_per_case: Number(formState.avgHumanMinutesPerCase),
        avg_cases_per_run: parseOptionalNumber(formState.avgCasesPerRun),
        analyst_hourly_cost: Number(formState.analystHourlyCost),
        fte_hours_per_year: Number(formState.fteHoursPerYear),
        confidence_level: formState.confidenceLevel || null,
        description: formState.description.trim() || null,
        notes: formState.notes.trim() || null,
        is_active: Boolean(formState.isActive),
      };
      const saved = await saveDeploymentFte({
        deploymentId,
        body: payload,
      });
      onSaved?.(saved);
    } catch (requestError) {
      setSubmitError(getApiErrorMessage(requestError, 'Failed to save FTE configuration'));
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2.1} sx={{ mt: 1 }}>
        <Box
          sx={{
            ...sectionCardSx,
            p: { xs: 1.75, sm: 2.25 },
            background: 'linear-gradient(150deg, rgba(0, 203, 221, 0.22), rgba(143, 42, 163, 0.15))',
            borderColor: 'rgba(0, 203, 221, 0.35)',
          }}
        >
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.1 }}>
            FTE Configuration
          </Typography>
          <Typography variant="h6" sx={{ mt: 0.1, lineHeight: 1.2 }}>
            {deploymentName || 'Deployment'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
            Configure assumptions for calculating human effort replaced, FTE equivalent, and labor cost impact.
          </Typography>
          <Box sx={{ mt: 1.25, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip
              size="small"
              icon={<AccessTimeOutlinedIcon fontSize="small" />}
              label={estimatedHoursPerRun !== null ? `${formatNumber(estimatedHoursPerRun)} hrs/run` : 'Hours/run pending inputs'}
              color="cyberAqua"
              variant="outlined"
            />
            <Chip
              size="small"
              icon={<MonetizationOnOutlinedIcon fontSize="small" />}
              label={estimatedCostPerRun !== null ? `$${formatNumber(estimatedCostPerRun)} per run` : 'Cost/run pending inputs'}
              color="cyberMag"
              variant="outlined"
            />
          </Box>
        </Box>

        {!isAdmin ? (
          <Alert severity="warning">
            Admin privileges are required to update FTE settings.
          </Alert>
        ) : null}

        {isError ? (
          <Alert severity="error">
            {error?.message || 'Failed to load existing FTE settings'}
          </Alert>
        ) : null}

        {isSaveError ? (
          <Alert severity="error">
            {saveError?.message || 'Failed to save FTE settings'}
          </Alert>
        ) : null}

        {submitError ? (
          <Alert severity="error">{submitError}</Alert>
        ) : null}

        <Box sx={sectionCardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeOutlinedIcon sx={{ color: 'cyberAqua.main' }} />
            <Typography variant="subtitle2">Human Effort Model</Typography>
            <Tooltip
              arrow
              placement="top"
              title={(
                <Box sx={{ maxWidth: 590 }}>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mb: 0.4 }}>
                    Instructions
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block' }}>
                    Average Human Minutes Per Process: 
                    The average amount of time it would take an investigator to perform this process.
                    e.g. The average number of minutes it takes a human to create one case.
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                    Average Processes Per Run: 
                    Number of processes automated in each run. 
                    Leave blank if not tracked.
                    e.g. A daily scheduled run creates 100 cases.
                  </Typography>
                </Box>
              )}
            >
              <Box
                component="span"
                aria-label="Human effort model guidance"
                sx={helpBadgeSx}
              >
                !
              </Box>
            </Tooltip>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
            Define how much investigator time this deployment replaces.
          </Typography>
          <Divider sx={{ my: 1.4, borderColor: 'rgba(255,255,255,0.09)' }} />
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            }}
          >
            <TextField
              label="Average Human Minutes Per Process"
              type="number"
              value={formState.avgHumanMinutesPerCase}
              onChange={updateField('avgHumanMinutesPerCase')}
              required
              disabled={isLoading || isSavePending}
              error={validation.avgHumanMinutesPerCaseError}
              helperText="Manual investigator time per process."
              inputProps={{ min: 0.01, step: 0.01 }}
              fullWidth
              sx={fieldSx}
            />

            <TextField
              label="Average Processes Per Run"
              type="number"
              value={formState.avgCasesPerRun}
              onChange={updateField('avgCasesPerRun')}
              disabled={isLoading || isSavePending}
              error={validation.avgCasesPerRunError}
              helperText="Optional when tracked per run."
              inputProps={{ min: 0.01, step: 0.01 }}
              fullWidth
              sx={fieldSx}
            />
          </Box>
        </Box>

        <Box sx={sectionCardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MonetizationOnOutlinedIcon sx={{ color: 'cyberMag.main' }} />
            <Typography variant="subtitle2">Financial & Capacity Model</Typography>
            <Tooltip
              arrow
              placement="top"
              title={(
                <Box sx={{ maxWidth: 290 }}>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mb: 0.4 }}>
                    Instructions
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block' }}>
                    Analyst Hourly Cost: 
                    Fully loaded labor cost per hour for the manual process.
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                    FTE Hours Per Year: 
                    Annual working-hour baseline used to convert saved time into FTE.
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                    Confidence and Status help communicate model reliability and whether it is currently active.
                  </Typography>
                </Box>
              )}
            >
              <Box
                component="span"
                aria-label="Financial and capacity model guidance"
                sx={helpBadgeSx}
              >
                !
              </Box>
            </Tooltip>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
            Cost assumptions and annual hours baseline used for FTE conversion.
          </Typography>
          <Divider sx={{ my: 1.4, borderColor: 'rgba(255,255,255,0.09)' }} />
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            }}
          >
            <TextField
              label="Investigator Hourly Cost (USD)"
              type="number"
              value={formState.analystHourlyCost}
              onChange={updateField('analystHourlyCost')}
              required
              disabled={isLoading || isSavePending}
              error={validation.analystHourlyCostError}
              helperText="Fully loaded hourly cost."
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
              sx={fieldSx}
            />

            <TextField
              label="FTE Hours Per Year"
              type="number"
              value={formState.fteHoursPerYear}
              onChange={updateField('fteHoursPerYear')}
              required
              disabled={isLoading || isSavePending}
              error={validation.fteHoursPerYearError}
              helperText="Default: 2080."
              inputProps={{ min: 1, step: 1 }}
              fullWidth
              sx={fieldSx}
            />

            <FormControl fullWidth disabled={isLoading || isSavePending} sx={fieldSx}>
              <InputLabel id="fte-confidence-level-label">Confidence Level</InputLabel>
              <Select
                labelId="fte-confidence-level-label"
                value={formState.confidenceLevel}
                label="Confidence Level"
                onChange={updateField('confidenceLevel')}
              >
                <MenuItem value="">Not set</MenuItem>
                {CONFIDENCE_OPTIONS.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={isLoading || isSavePending} sx={fieldSx}>
              <InputLabel id="fte-is-active-label">Status</InputLabel>
              <Select
                labelId="fte-is-active-label"
                value={String(formState.isActive)}
                label="Status"
                onChange={handleToggleIsActive}
              >
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Box sx={sectionCardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotesOutlinedIcon sx={{ color: 'cyberAqua.main' }} />
            <Typography variant="subtitle2">Context & Notes</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
            Save rationale and assumptions for auditability.
          </Typography>
          <Divider sx={{ my: 1.4, borderColor: 'rgba(255,255,255,0.09)' }} />
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            <TextField
              label="Description"
              value={formState.description}
              onChange={updateField('description')}
              disabled={isLoading || isSavePending}
              fullWidth
              sx={fieldSx}
            />

            <TextField
              label="Notes"
              value={formState.notes}
              onChange={updateField('notes')}
              disabled={isLoading || isSavePending}
              multiline
              minRows={4}
              fullWidth
              sx={fieldSx}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.2, flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant="outlined"
            color="secondary"
            onClick={onCancel}
            disabled={isSavePending}
            startIcon={<CloseOutlinedIcon />}
            sx={{
              borderRadius: 999,
              px: 2,
            }}
          >
            Close
          </Button>
          <Button
            type="submit"
            variant="contained"
            // NOTE: this is temporarily disabled until we have a way to validate the form
            disabled
            // disabled={isSubmitDisabled}
            startIcon={<SaveOutlinedIcon />}
            sx={{
              borderRadius: 999,
              px: 2.4,
              background: 'linear-gradient(120deg, rgba(0,203,221,0.85), rgba(143,42,163,0.8))',
              '&:hover': {
                background: 'linear-gradient(120deg, rgba(0,203,221,1), rgba(143,42,163,0.95))',
              },
            }}
          >
            {isSavePending ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
