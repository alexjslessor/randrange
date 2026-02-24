import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DeploymentMetaChips from '../src/components/DeploymentMetaChips';

describe('DeploymentMetaChips', () => {
  const deployment = {
    status: 'READY',
    updated: '2025-06-01T10:00:00Z',
    paused: false,
  };

  it('renders status and updated chips', () => {
    render(<DeploymentMetaChips deployment={deployment} />);
    expect(screen.getByText('READY')).toBeInTheDocument();
  });

  it('renders Paused chip when deployment is paused', () => {
    render(<DeploymentMetaChips deployment={{ ...deployment, paused: true }} />);
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('does not render Paused chip when not paused', () => {
    render(<DeploymentMetaChips deployment={deployment} />);
    expect(screen.queryByText('Paused')).not.toBeInTheDocument();
  });

  it('renders UNKNOWN status when deployment has no status', () => {
    render(<DeploymentMetaChips deployment={{}} />);
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
  });

  it('renders without deployment prop', () => {
    render(<DeploymentMetaChips />);
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
  });

  it('renders status first when statusFirst is true', () => {
    const { container } = render(<DeploymentMetaChips deployment={deployment} statusFirst />);
    const html = container.innerHTML;
    expect(html.indexOf('READY')).toBeLessThan(html.indexOf('2025'));
  });
});
