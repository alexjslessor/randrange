import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DeploymentLogsPanel from '../src/components/DeploymentLogsPanel';

describe('DeploymentLogsPanel', () => {
  it('renders Latest Flow Run heading', () => {
    render(<DeploymentLogsPanel />);
    expect(screen.getByText('Latest Flow Run')).toBeInTheDocument();
  });

  it('shows no flow runs message when flowRunId is empty', () => {
    render(<DeploymentLogsPanel />);
    expect(screen.getByText('No flow runs found for this deployment yet.')).toBeInTheDocument();
  });

  it('shows loading message when isFlowRunLoading is true', () => {
    render(<DeploymentLogsPanel isFlowRunLoading />);
    expect(screen.getByText('Loading flow run details...')).toBeInTheDocument();
  });

  it('shows flow run error message', () => {
    render(<DeploymentLogsPanel isFlowRunError flowRunError={{ message: 'Run fetch failed' }} />);
    expect(screen.getByText('Run fetch failed')).toBeInTheDocument();
  });

  it('shows loading logs message when flowRunId is set and isLogsLoading', () => {
    render(<DeploymentLogsPanel flowRunId="run-1" isLogsLoading />);
    expect(screen.getByText('Loading logs...')).toBeInTheDocument();
  });

  it('shows no logs message when flowRunId is set and logs are empty', () => {
    render(<DeploymentLogsPanel flowRunId="run-1" logs={[]} />);
    expect(screen.getByText('No logs available yet.')).toBeInTheDocument();
  });

  it('renders log entries', () => {
    const logs = [
      { id: '1', timestamp: '2025-01-01T00:00:00Z', level: 'INFO', message: 'Flow started' },
      { id: '2', timestamp: '2025-01-01T00:01:00Z', level: 'ERROR', message: 'Something failed' },
    ];
    render(<DeploymentLogsPanel flowRunId="run-1" logs={logs} />);
    expect(screen.getByText('Flow started')).toBeInTheDocument();
    expect(screen.getByText('Something failed')).toBeInTheDocument();
  });

  it('shows polling chip when isPolling is true', () => {
    render(<DeploymentLogsPanel isPolling />);
    expect(screen.getByText('Polling')).toBeInTheDocument();
  });

  it('shows refreshing logs message when isLogsFetching', () => {
    render(<DeploymentLogsPanel flowRunId="run-1" logs={[]} isLogsFetching />);
    expect(screen.getByText('Refreshing logs...')).toBeInTheDocument();
  });
});
