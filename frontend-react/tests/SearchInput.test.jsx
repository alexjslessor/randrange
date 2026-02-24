import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SearchInput from '../src/components/SearchInput';

describe('SearchInput', () => {
  it('submits trimmed search text', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<SearchInput onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('Search');
    await user.type(input, '   hello world   ');
    await user.click(screen.getByLabelText('Run search'));

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('hello world');
  });

  it('clears search and sends empty value', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<SearchInput onSearch={onSearch} defaultValue="initial" />);

    const input = screen.getByDisplayValue('initial');
    await user.click(screen.getByLabelText('Clear search'));

    expect(onSearch).toHaveBeenCalledWith('');
    expect(input).toHaveValue('');
  });

  it('respects disabled state for input and actions', () => {
    render(<SearchInput onSearch={vi.fn()} defaultValue="value" disabled />);

    expect(screen.getByPlaceholderText('Search')).toBeDisabled();
    expect(screen.getByLabelText('Run search')).toBeDisabled();
    expect(screen.getByLabelText('Clear search')).toBeDisabled();
  });
});
