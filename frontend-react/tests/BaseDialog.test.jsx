
import { fireEvent, render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import BaseDialog from '../src/components/BaseDialog';

const createTestTheme = () => {
  const theme = createTheme();
  theme.customStyles = {
    dashboard: {
      dialog: {
        paper: {},
        title: {},
        content: {},
        actions: {},
      },
    },
  };
  return theme;
};

const renderDialog = (props = {}) => {
  const onClose = props.onClose ?? vi.fn();
  const theme = createTestTheme();
  const {
    open = true,
    title = 'Test Dialog',
    children = <div>Dialog Body</div>,
    ...rest
  } = props;

  render(
    <ThemeProvider theme={theme}>
      <BaseDialog open={open} onClose={onClose} title={title} {...rest}>
        {children}
      </BaseDialog>
    </ThemeProvider>,
  );

  return { onClose };
};

describe('BaseDialog', () => {
  it('renders title, subtitle, icon, content, and actions', () => {
    const TestIcon = () => <span data-testid="dialog-icon" />;

    renderDialog({
      title: 'Invite User',
      subtitle: 'Grant access',
      icon: TestIcon,
      actions: <button type="button">Save</button>,
      children: <div>Form content</div>,
    });

    expect(screen.getByText('Invite User')).toBeInTheDocument();
    expect(screen.getByText('Grant access')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-icon')).toBeInTheDocument();
    expect(screen.getByText('Form content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('does not render actions section when actions are not provided', () => {
    renderDialog();

    expect(document.querySelector('.MuiDialogActions-root')).not.toBeInTheDocument();
  });

  it('calls onClose when the close icon button is clicked', () => {
    const onClose = vi.fn();
    renderDialog({ onClose, title: 'Preferences' });

    fireEvent.click(screen.getByLabelText('Close Preferences dialog'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the close button disabled while submitting', () => {
    const onClose = vi.fn();
    renderDialog({ onClose, isSubmitting: true, title: 'Preferences' });

    const closeButton = screen.getByLabelText('Close Preferences dialog');

    expect(closeButton).toBeDisabled();
    fireEvent.click(closeButton);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose on backdrop click', () => {
    const onClose = vi.fn();
    renderDialog({ onClose });

    const backdrop = document.querySelector('.MuiBackdrop-root');
    expect(backdrop).toBeInTheDocument();

    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);

    expect(onClose).not.toHaveBeenCalled();
  });
});
