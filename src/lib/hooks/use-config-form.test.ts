import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useConfigForm } from './use-config-form';
import type { JsonSchema7 } from '@/types/api/variant.types';

const schema: JsonSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  title: 'Test Config',
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
      default: true,
      title: 'Enabled',
    },
    label: {
      type: 'string',
      title: 'Label',
    },
  },
  required: ['difficulty', 'label'],
};

describe('useConfigForm', () => {
  it('initializes values from schema defaults', () => {
    const { result } = renderHook(() => useConfigForm(schema));
    expect(result.current.values.difficulty).toBe(5);
    expect(result.current.values.duration_seconds).toBe(120);
    expect(result.current.values.hand).toBe('right');
    expect(result.current.values.enabled).toBe(true);
  });

  it('initializes values from initialValues over schema defaults', () => {
    const { result } = renderHook(() =>
      useConfigForm(schema, { difficulty: 8, hand: 'left' }),
    );
    expect(result.current.values.difficulty).toBe(8);
    expect(result.current.values.hand).toBe('left');
    // duration_seconds not in initialValues → falls back to default
    expect(result.current.values.duration_seconds).toBe(120);
  });

  it('setValue updates the correct key', () => {
    const { result } = renderHook(() => useConfigForm(schema));
    act(() => {
      result.current.setValue('difficulty', 9);
    });
    expect(result.current.values.difficulty).toBe(9);
  });

  it('setValue clears the error for that key', () => {
    const { result } = renderHook(() => useConfigForm(schema));
    // Force an error state by submitting with empty label
    act(() => {
      result.current.setValue('label', '');
    });
    act(() => {
      result.current.validate();
    });
    expect(result.current.errors.label).toBeTruthy();
    // Now set a value — error should clear
    act(() => {
      result.current.setValue('label', 'test');
    });
    expect(result.current.errors.label).toBeFalsy();
  });

  it('validate returns false and sets errors for required empty field', () => {
    const { result } = renderHook(() => useConfigForm(schema));
    // label has no default → empty string
    let valid: boolean = true;
    act(() => {
      valid = result.current.validate();
    });
    expect(valid).toBe(false);
    expect(result.current.errors.label).toBeTruthy();
  });

  it('validate returns false when number is out of range', () => {
    const { result } = renderHook(() =>
      useConfigForm(schema, { difficulty: 99, label: 'ok' }),
    );
    let valid: boolean = true;
    act(() => {
      valid = result.current.validate();
    });
    expect(valid).toBe(false);
    expect(result.current.errors.difficulty).toMatch(/at most 10/i);
  });

  it('validate returns true when all fields are valid', () => {
    const { result } = renderHook(() =>
      useConfigForm(schema, { difficulty: 5, label: 'hello' }),
    );
    let valid: boolean = false;
    act(() => {
      valid = result.current.validate();
    });
    expect(valid).toBe(true);
    expect(Object.values(result.current.errors).every((e) => !e)).toBe(true);
  });

  it('getCoercedValues converts string representations to correct types', () => {
    const { result } = renderHook(() => useConfigForm(schema));
    act(() => {
      result.current.setValue('difficulty', '7');
      result.current.setValue('label', 'test');
    });
    const coerced = result.current.getCoercedValues();
    expect(typeof coerced.difficulty).toBe('number');
    expect(coerced.difficulty).toBe(7);
    expect(typeof coerced.enabled).toBe('boolean');
  });

  it('reset restores values from new initialValues', () => {
    const { result } = renderHook(() => useConfigForm(schema));
    act(() => {
      result.current.setValue('difficulty', 3);
    });
    act(() => {
      result.current.reset({ difficulty: 1 });
    });
    expect(result.current.values.difficulty).toBe(1);
    expect(Object.values(result.current.errors).every((e) => !e)).toBe(true);
  });
});
