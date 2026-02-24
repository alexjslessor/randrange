import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PaginationControl from '../src/components/PaginationControl';

describe('PaginationControl', () => {
  it('renders navigation controls and page buttons', () => {
    render(<PaginationControl totalPages={5} currentPage={2} onPageChange={vi.fn()} />);

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to first page')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to last page')).toBeInTheDocument();
    expect(screen.getByLabelText('page 2')).toBeInTheDocument();
  });

  it('calls onPageChange with selected page', () => {
    const onPageChange = vi.fn();
    render(<PaginationControl totalPages={5} currentPage={1} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByLabelText('Go to page 3'));

    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange.mock.calls[0][1]).toBe(3);
  });
});
