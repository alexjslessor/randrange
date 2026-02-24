import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeploymentParamsForm from '../src/components/DeploymentParamsForm';

const stringSchema = {
  properties: {
    env: { type: 'string', title: 'Environment', description: 'Target env' },
  },
};

const enumSchema = {
  properties: {
    mode: { type: 'string', title: 'Mode', enum: ['dev', 'prod'] },
  },
};

const boolSchema = {
  properties: {
    enabled: { type: 'boolean', title: 'Enabled' },
  },
};

const numberSchema = {
  properties: {
    count: { type: 'integer', title: 'Count', description: 'Item count' },
  },
};

describe('DeploymentParamsForm', () => {
  it('renders nothing when schema has no properties', () => {
    const { container } = render(<DeploymentParamsForm parameterSchema={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders string field with label', () => {
    render(<DeploymentParamsForm parameterSchema={stringSchema} />);
    expect(screen.getByLabelText('Environment')).toBeInTheDocument();
  });

  it('renders enum field as select', () => {
    render(<DeploymentParamsForm parameterSchema={enumSchema} />);
    expect(screen.getByLabelText('Mode')).toBeInTheDocument();
  });

  it('renders boolean field as select', () => {
    render(<DeploymentParamsForm parameterSchema={boolSchema} />);
    expect(screen.getByLabelText('Enabled')).toBeInTheDocument();
  });

  it('renders number field', () => {
    render(<DeploymentParamsForm parameterSchema={numberSchema} />);
    expect(screen.getByLabelText('Count')).toBeInTheDocument();
  });

  it('populates initial value from initialParameters', () => {
    render(
      <DeploymentParamsForm
        parameterSchema={stringSchema}
        initialParameters={{ env: 'staging' }}
      />,
    );
    expect(screen.getByDisplayValue('staging')).toBeInTheDocument();
  });

  it('calls onChange with parsed parameters on input change', async () => {
    const onChange = vi.fn();
    render(
      <DeploymentParamsForm parameterSchema={stringSchema} onChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText('Environment'), { target: { value: 'prod' } });
    await waitFor(() => {
      const lastCall = onChange.mock.calls.at(-1)[0];
      expect(lastCall.parameters.env).toBe('prod');
      expect(lastCall.isValid).toBe(true);
    });
  });

  it('shows Deployment Parameters heading', () => {
    render(<DeploymentParamsForm parameterSchema={stringSchema} />);
    expect(screen.getByText('Deployment Parameters')).toBeInTheDocument();
  });
});
