import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Toast from '../src/components/Toast';

describe('Toast', () => {
  it('renders message when open', () => {
    render(<Toast isOpen message="Operation successful" severity="success" />);
    expect(screen.getByText('Operation successful')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Toast isOpen message="Done" title="Success" severity="success" />);
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<Toast isOpen={false} message="Hidden" severity="info" />);
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Toast isOpen message="Close me" severity="error" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders with warning severity', () => {
    render(<Toast isOpen message="Watch out" severity="warning" />);
    expect(screen.getByText('Watch out')).toBeInTheDocument();
  });

  it('renders with info severity as fallback for unknown severity', () => {
    render(<Toast isOpen message="Info msg" severity="unknown" />);
    expect(screen.getByText('Info msg')).toBeInTheDocument();
  });
});
