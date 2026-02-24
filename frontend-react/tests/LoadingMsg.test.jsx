import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoadingMsg from '../src/components/LoadingMsg';

describe('LoadingMsg', () => {
  it('renders default loading state', () => {
    render(<LoadingMsg />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveClass('MuiCircularProgress-colorPrimary');
  });

  it('renders custom message and mapped progress color', () => {
    render(<LoadingMsg msg="Syncing data" color="warning" />);

    expect(screen.getByText('Syncing data')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveClass('MuiCircularProgress-colorWarning');
  });

  it('falls back to primary color for unsupported values', () => {
    render(<LoadingMsg color="unknown-color" />);

    expect(screen.getByRole('progressbar')).toHaveClass('MuiCircularProgress-colorPrimary');
  });
});
