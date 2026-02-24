import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GroupTable from '../src/components/GroupTable';

const data = [
  {
    group_name: 'admins',
    username: 'alice',
    deployment_name: 'deploy-a',
    group_permissions: ['read', 'write'],
    direct_user_permissions: ['read'],
    effective_permissions: ['read', 'write'],
  },
  {
    group_name: 'viewers',
    username: 'bob',
    deployment_name: 'deploy-b',
    group_permissions: ['read'],
    direct_user_permissions: [],
    effective_permissions: ['read'],
  },
];

describe('GroupTable', () => {
  it('renders column headers', () => {
    render(<GroupTable data={data} />);
    expect(screen.getByText('Group')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Deployment')).toBeInTheDocument();
    expect(screen.getByText('Effective Permissions')).toBeInTheDocument();
  });

  it('renders row data', () => {
    render(<GroupTable data={data} />);
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('renders permission badges', () => {
    render(<GroupTable data={data} />);
    expect(screen.getAllByText('read').length).toBeGreaterThan(0);
  });

  it('renders pagination controls', () => {
    render(<GroupTable data={data} />);
    expect(screen.getByText(/page/i)).toBeInTheDocument();
  });

  it('calls onEdit with row data when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<GroupTable data={data} onEdit={onEdit} />);
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    expect(onEdit).toHaveBeenCalledWith(data[0]);
  });

  it('renders empty table without crashing', () => {
    render(<GroupTable data={[]} />);
    expect(screen.getByText('Group')).toBeInTheDocument();
  });
});
