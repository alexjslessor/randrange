import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FlowRunActionsMenu from '../src/components/FlowRunActionsMenu';

describe('FlowRunActionsMenu', () => {
  it('renders the actions icon button', () => {
    render(<FlowRunActionsMenu />);
    expect(screen.getByLabelText('Flow run actions')).toBeInTheDocument();
  });

  it('opens menu on icon button click', () => {
    render(<FlowRunActionsMenu />);
    fireEvent.click(screen.getByLabelText('Flow run actions'));
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('does not open menu when disabled', () => {
    render(<FlowRunActionsMenu disabled />);
    fireEvent.click(screen.getByLabelText('Flow run actions'));
    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
  });

  it('calls onOpenNotes when Notes menu item is clicked', () => {
    const onOpenNotes = vi.fn();
    render(<FlowRunActionsMenu onOpenNotes={onOpenNotes} />);
    fireEvent.click(screen.getByLabelText('Flow run actions'));
    fireEvent.click(screen.getByText('Notes'));
    expect(onOpenNotes).toHaveBeenCalledTimes(1);
  });

  it('closes menu after clicking Notes', () => {
    render(<FlowRunActionsMenu onOpenNotes={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Flow run actions'));
    const menuItem = screen.getByText('Notes');
    expect(menuItem).toBeVisible();
    fireEvent.click(menuItem);
    expect(screen.queryByText('Notes')).not.toBeVisible();
  });
});
