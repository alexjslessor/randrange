import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SelectForm from '../src/components/styledComponents/SelectForm';

describe('SelectForm', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ];

  it('renders label and options', () => {
    render(<SelectForm labelText="My Label" options={options} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('uses selected prop as initial value', () => {
    render(<SelectForm labelText="Pick" options={options} selected="b" />);
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('calls onChange with selected value', () => {
    const onChange = vi.fn();
    render(<SelectForm labelText="Pick" options={options} onChange={onChange} />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Option A'));
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('renders without options or label gracefully', () => {
    render(<SelectForm />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
