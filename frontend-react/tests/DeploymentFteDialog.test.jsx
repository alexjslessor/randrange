import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import DeploymentFteDialog from '../src/components/DeploymentFteDialog';

vi.mock('@/hooks/useDeploymentFte', () => ({
  useDeploymentFte: () => ({ data: null, isLoading: false, isError: false, error: null }),
  useSaveDeploymentFte: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }),
}));

const createTestTheme = () => {
  const theme = createTheme();
  theme.customStyles = {
    field: {},
    dashboard: {
      dialog: {
        paper: {},
        title: {},
        content: {},
        actions: {},
        sectionCard: {},
        helpBadge: {},
      },
    },
  };
  return theme;
};

const renderDialog = (props = {}) => {
  const onClose = props.onClose ?? vi.fn();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ThemeProvider theme={createTestTheme()}>
        <DeploymentFteDialog open onClose={onClose} {...props} />
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return { onClose };
};

describe('DeploymentFteDialog', () => {
  it('renders dialog title', () => {
    renderDialog();
    expect(screen.getByText('Deployment FTE')).toBeInTheDocument();
  });

  it('renders deployment name in form header', () => {
    renderDialog({ deployment: { id: '1', name: 'my-deployment' } });
    expect(screen.getByText('my-deployment')).toBeInTheDocument();
  });

  it('calls onClose when Close button is clicked', () => {
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByLabelText('Close Deployment FTE dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows admin warning when isAdmin is false', () => {
    renderDialog({ isAdmin: false });
    expect(screen.getByText(/admin privileges are required/i)).toBeInTheDocument();
  });
});
