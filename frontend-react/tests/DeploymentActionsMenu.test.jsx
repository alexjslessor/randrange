import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeploymentActionsMenu from '../src/components/DeploymentActionsMenu';

describe('DeploymentActionsMenu', () => {
  it('renders the actions icon button', () => {
    render(<DeploymentActionsMenu />);
    expect(screen.getByLabelText('Deployment actions')).toBeInTheDocument();
  });

  it('opens menu on icon button click', () => {
    render(<DeploymentActionsMenu canManageFte />);
    fireEvent.click(screen.getByLabelText('Deployment actions'));
    expect(screen.getByText('FTE')).toBeInTheDocument();
  });

  it('does not open menu when disabled', () => {
    render(<DeploymentActionsMenu disabled />);
    fireEvent.click(screen.getByLabelText('Deployment actions'));
    expect(screen.queryByText('FTE')).not.toBeInTheDocument();
  });

  it('calls onOpenFte when FTE menu item is clicked and canManageFte is true', () => {
    const onOpenFte = vi.fn();
    render(<DeploymentActionsMenu onOpenFte={onOpenFte} canManageFte />);
    fireEvent.click(screen.getByLabelText('Deployment actions'));
    fireEvent.click(screen.getByText('FTE'));
    expect(onOpenFte).toHaveBeenCalledTimes(1);
  });

  it('does not call onOpenFte when canManageFte is false', () => {
    const onOpenFte = vi.fn();
    render(<DeploymentActionsMenu onOpenFte={onOpenFte} canManageFte={false} />);
    fireEvent.click(screen.getByLabelText('Deployment actions'));
    fireEvent.click(screen.getByText('FTE'));
    expect(onOpenFte).not.toHaveBeenCalled();
  });
});
