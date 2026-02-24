import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeploymentFiltersCard from '../src/components/DeploymentFiltersCard';

describe('DeploymentFiltersCard', () => {
  it('renders Filters heading', () => {
    render(<DeploymentFiltersCard />);
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('renders Tags and Schedule date fields', () => {
    render(<DeploymentFiltersCard />);
    expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/schedule date/i)).toBeInTheDocument();
  });

  it('renders Clear button when onClear is provided', () => {
    const onClear = vi.fn();
    render(<DeploymentFiltersCard onClear={onClear} />);
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('calls onClear when Clear button is clicked', () => {
    const onClear = vi.fn();
    render(<DeploymentFiltersCard onClear={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('does not render Clear button when onClear is not provided', () => {
    render(<DeploymentFiltersCard />);
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
  });

  it('calls onScheduleDateChange when date input changes', () => {
    const onScheduleDateChange = vi.fn();
    render(<DeploymentFiltersCard onScheduleDateChange={onScheduleDateChange} />);
    fireEvent.change(screen.getByLabelText(/schedule date/i), { target: { value: '2025-01-01' } });
    expect(onScheduleDateChange).toHaveBeenCalledWith('2025-01-01');
  });

  it('renders children inside extras section', () => {
    render(
      <DeploymentFiltersCard>
        <div>Extra Filter</div>
      </DeploymentFiltersCard>,
    );
    expect(screen.getByText('Extra Filter')).toBeInTheDocument();
  });
});
