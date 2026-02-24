import { fireEvent, render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import DeploymentRunDialog from '../src/components/DeploymentRunDialog';

const createTestTheme = () => {
  const theme = createTheme();
  theme.customStyles = {
    field: {},
    dashboard: { dialog: { paper: {}, title: {}, content: {}, actions: {} } },
  };
  return theme;
};

const renderDialog = (props = {}) => {
  const onClose = props.onClose ?? vi.fn();
  const onSubmit = props.onSubmit ?? vi.fn();
  render(
    <ThemeProvider theme={createTestTheme()}>
      <DeploymentRunDialog open onClose={onClose} onSubmit={onSubmit} {...props} />
    </ThemeProvider>,
  );
  return { onClose, onSubmit };
};

describe('DeploymentRunDialog', () => {
  it('renders dialog title', () => {
    renderDialog();
    expect(screen.getByText('Run Deployment')).toBeInTheDocument();
  });

  it('renders deployment name when provided', () => {
    renderDialog({ deploymentName: 'my-flow' });
    expect(screen.getByText('my-flow')).toBeInTheDocument();
  });

  it('renders Reason Category select and Reason textarea', () => {
    renderDialog();
    expect(screen.getByLabelText('Reason Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Reason')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSubmit with reasonType and reasonText on form submit', () => {
    const { onSubmit } = renderDialog();
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Needs rerun' } });
    fireEvent.click(screen.getByRole('button', { name: /^run$/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ reasonType: 'FAILED', reasonText: 'Needs rerun' }),
    );
  });

  it('disables Run button while isSubmitting', () => {
    renderDialog({ isSubmitting: true });
    expect(screen.getByRole('button', { name: /starting/i })).toBeDisabled();
  });
});
