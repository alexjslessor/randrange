import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProgressCircle from '../src/components/ProgressCircle';

describe('ProgressCircle', () => {
  it('renders rounded percentage label from value', () => {
    render(<ProgressCircle value={42.6} />);

    expect(screen.getByText('43%')).toBeInTheDocument();
  });

  it('passes props to CircularProgress', () => {
    render(<ProgressCircle value={75} color="secondary" />);

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveClass('MuiCircularProgress-determinate');
    expect(progressbar).toHaveClass('MuiCircularProgress-colorSecondary');
    expect(progressbar).toHaveAttribute('aria-valuenow', '75');
  });
});
