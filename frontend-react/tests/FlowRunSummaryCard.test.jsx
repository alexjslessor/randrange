import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FlowRunSummaryCard from '../src/components/FlowRunSummaryCard';

const run = {
  id: 'run-abc',
  name: 'my-flow-run',
  state_name: 'COMPLETED',
  created: '2025-06-01T10:00:00Z',
  expected_start_time: '2025-06-01T10:01:00Z',
  start_time: '2025-06-01T10:02:00Z',
  end_time: '2025-06-01T10:05:00Z',
  total_run_time: 180,
  parameters: { env: 'prod' },
};

describe('FlowRunSummaryCard', () => {
  it('renders run name', () => {
    render(<FlowRunSummaryCard run={run} />);
    expect(screen.getByText('my-flow-run')).toBeInTheDocument();
  });

  it('renders run id', () => {
    render(<FlowRunSummaryCard run={run} />);
    expect(screen.getByText('run-abc')).toBeInTheDocument();
  });

  it('renders state chip', () => {
    render(<FlowRunSummaryCard run={run} />);
    expect(screen.getByText('State: COMPLETED')).toBeInTheDocument();
  });

  it('renders duration chip', () => {
    render(<FlowRunSummaryCard run={run} />);
    expect(screen.getByText('Duration: 3m 0s')).toBeInTheDocument();
  });

  it('renders parameter count chip', () => {
    render(<FlowRunSummaryCard run={run} />);
    expect(screen.getByText('1 params')).toBeInTheDocument();
  });

  it('calls onOpenNotes with run when Notes is clicked', () => {
    const onOpenNotes = vi.fn();
    render(<FlowRunSummaryCard run={run} onOpenNotes={onOpenNotes} />);
    fireEvent.click(screen.getByLabelText('Flow run actions'));
    fireEvent.click(screen.getByText('Notes'));
    expect(onOpenNotes).toHaveBeenCalledWith(run);
  });

  it('renders fallback text when run has no name', () => {
    render(<FlowRunSummaryCard run={{ id: 'x' }} />);
    expect(screen.getByText('Flow run')).toBeInTheDocument();
  });
});
