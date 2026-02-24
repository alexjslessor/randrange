import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SchedulingHeatmap from '../src/components/SchedulingHeatmap';

const chartData = {
  x: ['00:00', '00:15', '00:30'],
  y: ['Mon', 'Tue'],
  z: [
    [0, 2, 5],
    [1, 0, 3],
  ],
};

describe('SchedulingHeatmap', () => {
  it('renders title', () => {
    render(<SchedulingHeatmap chartData={chartData} title="My Heatmap" />);
    expect(screen.getByText('My Heatmap')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<SchedulingHeatmap chartData={chartData} subtitle="Weekly view" />);
    expect(screen.getByText('Weekly view')).toBeInTheDocument();
  });

  it('renders max risk chip', () => {
    render(<SchedulingHeatmap chartData={chartData} />);
    expect(screen.getByText('Max Risk 5.00')).toBeInTheDocument();
  });

  it('renders legend by default', () => {
    render(<SchedulingHeatmap chartData={chartData} />);
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('hides legend when showLegend is false', () => {
    render(<SchedulingHeatmap chartData={chartData} showLegend={false} />);
    expect(screen.queryByText('Low')).not.toBeInTheDocument();
  });

  it('renders row labels', () => {
    render(<SchedulingHeatmap chartData={chartData} />);
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
  });

  it('shows no data message when chartData is empty', () => {
    render(<SchedulingHeatmap chartData={{ z: [] }} />);
    expect(screen.getByText('No heatmap data available.')).toBeInTheDocument();
  });

  it('shows no data message when chartData is null', () => {
    render(<SchedulingHeatmap chartData={null} />);
    expect(screen.getByText('No heatmap data available.')).toBeInTheDocument();
  });
});
