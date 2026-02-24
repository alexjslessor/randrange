import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import DeploymentSummaryCard from '../src/components/DeploymentSummaryCard';

const deployment = {
  id: 'dep-1',
  name: 'my-deployment',
  status: 'READY',
  description: 'A test deployment',
  updated: '2025-06-01T10:00:00Z',
};

const renderCard = (props = {}) =>
  render(
    <MemoryRouter>
      <DeploymentSummaryCard deployment={deployment} {...props} />
    </MemoryRouter>,
  );

describe('DeploymentSummaryCard', () => {
  it('renders deployment name', () => {
    renderCard();
    expect(screen.getByText('my-deployment')).toBeInTheDocument();
  });

  it('renders deployment description', () => {
    renderCard();
    expect(screen.getByText('A test deployment')).toBeInTheDocument();
  });

  it('renders Run button', () => {
    renderCard({ onRun: vi.fn() });
    expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument();
  });

  it('calls onRun when Run button is clicked', () => {
    const onRun = vi.fn();
    renderCard({ onRun });
    fireEvent.click(screen.getByRole('button', { name: /run/i }));
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('disables Run button when runDisabled is true', () => {
    renderCard({ onRun: vi.fn(), runDisabled: true });
    expect(screen.getByRole('button', { name: /run/i })).toBeDisabled();
  });

  it('renders deployment name as link when titleLinkToDeployment is true', () => {
    renderCard({ titleLinkToDeployment: true });
    expect(screen.getByRole('link', { name: 'my-deployment' })).toBeInTheDocument();
  });

  it('renders Unnamed deployment when deployment has no name', () => {
    render(
      <MemoryRouter>
        <DeploymentSummaryCard deployment={{ id: 'x', status: 'READY' }} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Unnamed deployment')).toBeInTheDocument();
  });
});
