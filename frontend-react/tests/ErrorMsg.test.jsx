import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ErrorMsg from '../src/components/ErrorMsg';

describe('ErrorMsg', () => {
  it('renders default message with error severity', () => {
    render(<ErrorMsg />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('MuiAlert-standardError');
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('maps valid severity colors', () => {
    const severities = [
      ['success', 'MuiAlert-standardSuccess'],
      ['warning', 'MuiAlert-standardWarning'],
      ['info', 'MuiAlert-standardInfo'],
    ];

    severities.forEach(([color, className]) => {
      const { unmount } = render(<ErrorMsg msg="Status" color={color} />);
      expect(screen.getByRole('alert')).toHaveClass(className);
      unmount();
    });
  });

  it('falls back to error for unknown color values', () => {
    render(<ErrorMsg msg="Fallback" color="nonsense" />);

    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardError');
  });
});
