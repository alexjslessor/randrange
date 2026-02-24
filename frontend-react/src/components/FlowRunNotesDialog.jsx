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
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material';
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import BaseDialog from '@/components/BaseDialog';
import { useFlowRunNote, useUpsertFlowRunNote } from '@/hooks/useFlowRunNote';
import { getFlowRunStateLabel } from '@/utils/flowRunPresentation';
import { getApiErrorMessage } from '@/utils/apiError';
import { useTheme } from '@mui/material/styles';

const MIN_FAILED_NOTE_LENGTH = 60;

const isFailedState = (label) => {
  if (!label) return false;
  return label.includes('FAILED') || label.includes('CRASHED');
};

const getTrimmedLength = (value) => value.trim().length;

export default function FlowRunNotesDialog({
  open,
  onClose,
  flowRun,
  deploymentName = '',
}) {
  const theme = useTheme();
  const fieldSx = theme.customStyles.field;
  const flowRunId = flowRun?.id ? String(flowRun.id) : '';
  const flowRunStateLabel = getFlowRunStateLabel(flowRun, { uppercase: true });
  const requiresDetailedNote = isFailedState(flowRunStateLabel);

  const {
    data: existingNote,
    isLoading: isNoteLoading,
    isError: isNoteError,
    error: noteError,
  } = useFlowRunNote(
    flowRunId,
    {
      enabled: open && Boolean(flowRunId),
    },
  );
  const {
    mutateAsync: saveFlowRunNote,
    isPending: isSavePending,
    isError: isSaveError,
    error: saveError,
  } = useUpsertFlowRunNote();

  const [noteText, setNoteText] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!open) {
      setSubmitError('');
      return;
    }
    setNoteText(existingNote?.note_text || '');
    setSubmitError('');
  }, [open, flowRunId, existingNote?.note_text]);

  const trimmedLength = useMemo(
    () => getTrimmedLength(noteText),
    [noteText],
  );
  const isFailedNoteInvalid = requiresDetailedNote && trimmedLength < MIN_FAILED_NOTE_LENGTH;
  const progressValue = Math.min(
    100,
    Math.round((trimmedLength / MIN_FAILED_NOTE_LENGTH) * 100),
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!flowRunId || isSavePending || !noteText.trim() || isFailedNoteInvalid) {
      return;
    }

    setSubmitError('');
    try {
      await saveFlowRunNote({
        flowRunId,
        noteText: noteText.trim(),
      });
      onClose?.();
    } catch (requestError) {
      setSubmitError(getApiErrorMessage(requestError, 'Failed to save note'));
    }
  };

  const titleStateChipColor = requiresDetailedNote ? 'warning' : 'cyberAqua';

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title="Flow Run Notes"
      subtitle={deploymentName || 'Deployment'}
      icon={NoteAltOutlinedIcon}
      isSubmitting={isSavePending}
      actions={
        <>
          <Button
            onClick={onClose}
            color="secondary"
            variant="outlined"
            disabled={isSavePending}
            sx={{ borderRadius: 999, px: 2 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            color="primary"
            variant="contained"
            disabled={isSavePending || !noteText.trim() || isFailedNoteInvalid}
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
            {isSavePending ? 'Saving...' : 'Save Note'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Box
            sx={{
              p: 1.6,
              borderRadius: 2,
              border: '1px solid rgba(0, 203, 221, 0.25)',
              background: 'linear-gradient(145deg, rgba(0, 203, 221, 0.14), rgba(143, 42, 163, 0.1))',
            }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip
                size="small"
                label={`Flow run: ${flowRunId || 'Unknown'}`}
                color="cyberAqua"
                variant="outlined"
              />
              <Chip
                size="small"
                label={`State: ${flowRunStateLabel}`}
                color={titleStateChipColor}
                variant="outlined"
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.1 }}>
              Capture operational context, root cause, and mitigation for this run.
            </Typography>
          </Box>

          {requiresDetailedNote ? (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              This flow run is in a failed state. Include root cause, impacted systems/data, and the next remediation step.
            </Alert>
          ) : (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Add concise context for this run so operators can review decisions later.
            </Alert>
          )}

          {isNoteError ? (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {noteError?.message || 'Failed to load existing note'}
            </Alert>
          ) : null}

          {isSaveError ? (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {saveError?.message || 'Failed to save note'}
            </Alert>
          ) : null}

          {submitError ? (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {submitError}
            </Alert>
          ) : null}

          <TextField
            label="Run Note"
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            disabled={isSavePending || isNoteLoading}
            required
            multiline
            minRows={6}
            fullWidth
            error={isFailedNoteInvalid}
            helperText={
              isFailedNoteInvalid
                ? `For failed runs, write at least ${MIN_FAILED_NOTE_LENGTH} characters (${trimmedLength}/${MIN_FAILED_NOTE_LENGTH}).`
                : `${trimmedLength} characters`
            }
            sx={fieldSx}
          />

          {requiresDetailedNote ? (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                <Typography variant="caption" color="text.secondary">
                  Failed run note completeness
                </Typography>
                <Typography
                  variant="caption"
                  color={isFailedNoteInvalid ? 'warning.main' : 'success.main'}
                  sx={{ fontWeight: 600 }}
                >
                  {progressValue}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progressValue}
                color={isFailedNoteInvalid ? 'warning' : 'success'}
                sx={{
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                }}
              />
            </Box>
          ) : null}
        </Box>
      </form>
    </BaseDialog>
  );
}
