import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DynamicConfigForm } from './DynamicConfigForm';
import type { JsonSchema7 } from '@/types/api/variant.types';

const schema: JsonSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  title: 'Escalada Config',
  properties: {
    difficulty: {
      type: 'integer',
      minimum: 1,
      maximum: 10,
      default: 5,
      title: 'Difficulty',
    },
    duration_seconds: {
      type: 'integer',
      minimum: 30,
      maximum: 600,
      default: 120,
      title: 'Duration (s)',
    },
    hand: {
      type: 'string',
      enum: ['left', 'right', 'both'],
      default: 'right',
      title: 'Hand',
    },
    enabled: {
      type: 'boolean',
      default: false,
      title: 'Enabled',
    },
    notes: {
      type: 'string',
      title: 'Notes',
    },
  },
  required: ['difficulty', 'notes'],
};

describe('DynamicConfigForm', () => {
  it('renders a number input for integer field with min and max', () => {
    render(<DynamicConfigForm schema={schema} onSubmit={vi.fn()} />);
    const input = screen.getByLabelText(/difficulty/i);
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
    expect((input as HTMLInputElement).type).toBe('number');
    expect((input as HTMLInputElement).min).toBe('1');
    expect((input as HTMLInputElement).max).toBe('10');
    expect((input as HTMLInputElement).step).toBe('1');
  });

  it('renders a select for field with enum', () => {
    render(<DynamicConfigForm schema={schema} onSubmit={vi.fn()} />);
    const select = screen.getByLabelText(/hand/i);
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: 'left' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'right' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'both' })).toBeInTheDocument();
  });

  it('renders a checkbox for boolean field', () => {
    render(<DynamicConfigForm schema={schema} onSubmit={vi.fn()} />);
    const checkbox = screen.getByRole('checkbox', { name: /enabled/i });
    expect(checkbox).toBeInTheDocument();
    expect((checkbox as HTMLInputElement).type).toBe('checkbox');
  });

  it('applies default value as initial value for integer field', () => {
    render(<DynamicConfigForm schema={schema} onSubmit={vi.fn()} />);
    const input = screen.getByLabelText(/difficulty/i) as HTMLInputElement;
    expect(input.value).toBe('5');
  });

  it('applies default value for select field', () => {
    render(<DynamicConfigForm schema={schema} onSubmit={vi.fn()} />);
    const select = screen.getByLabelText(/hand/i) as HTMLSelectElement;
    expect(select.value).toBe('right');
  });

  it('applies default value for checkbox field', () => {
    render(<DynamicConfigForm schema={schema} onSubmit={vi.fn()} />);
    const checkbox = screen.getByRole('checkbox', { name: /enabled/i }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('shows error and does not call onSubmit when required field is empty', () => {
    const onSubmit = vi.fn();
    render(<DynamicConfigForm schema={schema} onSubmit={onSubmit} />);

    // notes is required and has no default — leave empty
    const submitBtn = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/notes is required/i)).toBeInTheDocument();
  });

  it('calls onSubmit with correctly typed values (number not string) on valid submit', () => {
    const onSubmit = vi.fn();
    render(<DynamicConfigForm schema={schema} onSubmit={onSubmit} />);

    // Fill required notes field
    const notesInput = screen.getByLabelText(/notes/i);
    fireEvent.change(notesInput, { target: { value: 'test note' } });

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledOnce();
    const config = onSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(typeof config.difficulty).toBe('number');
    expect(config.difficulty).toBe(5);
    expect(typeof config.duration_seconds).toBe('number');
    expect(config.duration_seconds).toBe(120);
    expect(typeof config.enabled).toBe('boolean');
    expect(config.notes).toBe('test note');
  });

  it('does not call onSubmit when a number field is out of range', () => {
    const onSubmit = vi.fn();
    render(<DynamicConfigForm schema={schema} onSubmit={onSubmit} />);

    // Set difficulty out of range
    const diffInput = screen.getByLabelText(/difficulty/i);
    fireEvent.change(diffInput, { target: { value: '999' } });

    // Fill required notes
    const notesInput = screen.getByLabelText(/notes/i);
    fireEvent.change(notesInput, { target: { value: 'ok' } });

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/at most 10/i)).toBeInTheDocument();
  });

  it('uses initialValues over schema defaults when provided', () => {
    render(
      <DynamicConfigForm
        schema={schema}
        initialValues={{ difficulty: 9 }}
        onSubmit={vi.fn()}
      />,
    );
    const input = screen.getByLabelText(/difficulty/i) as HTMLInputElement;
    expect(input.value).toBe('9');
  });

  it('renders cancel button and calls onCancel when clicked', () => {
    const onCancel = vi.fn();
    render(<DynamicConfigForm schema={schema} onSubmit={vi.fn()} onCancel={onCancel} />);
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('renders custom submitLabel', () => {
    render(
      <DynamicConfigForm schema={schema} onSubmit={vi.fn()} submitLabel="Apply Config" />,
    );
    expect(screen.getByRole('button', { name: /apply config/i })).toBeInTheDocument();
  });
});
