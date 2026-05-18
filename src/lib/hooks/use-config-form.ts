import { useReducer, useCallback } from 'react';
import type { JsonSchema7 } from '@/types/api/variant.types';

export interface FormValues {
  values: Record<string, unknown>;
  errors: Record<string, string>;
}

type Action =
  | { type: 'SET_VALUE'; key: string; value: unknown }
  | { type: 'SET_ERRORS'; errors: Record<string, string> }
  | { type: 'RESET'; values: Record<string, unknown> };

function reducer(state: FormValues, action: Action): FormValues {
  switch (action.type) {
    case 'SET_VALUE':
      return {
        ...state,
        values: { ...state.values, [action.key]: action.value },
        errors: { ...state.errors, [action.key]: '' },
      };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'RESET':
      return { values: action.values, errors: {} };
    default:
      return state;
  }
}

function buildInitialValues(
  schema: JsonSchema7,
  initialValues?: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const properties = schema.properties ?? {};

  for (const [key, fieldSchema] of Object.entries(properties)) {
    if (initialValues !== undefined && Object.prototype.hasOwnProperty.call(initialValues, key)) {
      result[key] = initialValues[key];
    } else if (fieldSchema.default !== undefined) {
      result[key] = fieldSchema.default;
    } else {
      const type = Array.isArray(fieldSchema.type) ? fieldSchema.type[0] : fieldSchema.type;
      if (type === 'boolean') {
        result[key] = false;
      } else if (type === 'number' || type === 'integer') {
        result[key] = '';
      } else {
        result[key] = '';
      }
    }
  }

  return result;
}

export interface ValidationError {
  key: string;
  message: string;
}

function validateValues(
  schema: JsonSchema7,
  values: Record<string, unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const properties = schema.properties ?? {};
  const required = schema.required ?? [];

  for (const [key, fieldSchema] of Object.entries(properties)) {
    const value = values[key];
    const type = Array.isArray(fieldSchema.type) ? fieldSchema.type[0] : fieldSchema.type;
    const label = fieldSchema.title ?? key;
    const isRequired = required.includes(key);

    const isEmpty = value === '' || value === null || value === undefined;

    if (isRequired && isEmpty && type !== 'boolean') {
      errors[key] = `${label} is required`;
      continue;
    }

    if ((type === 'number' || type === 'integer') && !isEmpty) {
      const num = Number(value);
      if (isNaN(num)) {
        errors[key] = `${label} must be a number`;
        continue;
      }
      if (fieldSchema.minimum !== undefined && num < fieldSchema.minimum) {
        errors[key] = `${label} must be at least ${fieldSchema.minimum}`;
        continue;
      }
      if (fieldSchema.maximum !== undefined && num > fieldSchema.maximum) {
        errors[key] = `${label} must be at most ${fieldSchema.maximum}`;
        continue;
      }
    }
  }

  return errors;
}

function coerceValues(
  schema: JsonSchema7,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const properties = schema.properties ?? {};

  for (const [key, fieldSchema] of Object.entries(properties)) {
    const value = values[key];
    const type = Array.isArray(fieldSchema.type) ? fieldSchema.type[0] : fieldSchema.type;

    if (type === 'number' || type === 'integer') {
      result[key] = value === '' || value === undefined || value === null ? 0 : Number(value);
    } else if (type === 'boolean') {
      result[key] = Boolean(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

export interface UseConfigFormResult {
  values: Record<string, unknown>;
  errors: Record<string, string>;
  setValue: (key: string, value: unknown) => void;
  validate: () => boolean;
  reset: (newInitialValues?: Record<string, unknown>) => void;
  getCoercedValues: () => Record<string, unknown>;
}

export function useConfigForm(
  schema: JsonSchema7,
  initialValues?: Record<string, unknown>,
): UseConfigFormResult {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    values: buildInitialValues(schema, initialValues),
    errors: {},
  }));

  const setValue = useCallback((key: string, value: unknown) => {
    dispatch({ type: 'SET_VALUE', key, value });
  }, []);

  const validate = useCallback((): boolean => {
    const errors = validateValues(schema, state.values);
    const hasErrors = Object.values(errors).some((e) => e !== '');
    if (hasErrors) {
      dispatch({ type: 'SET_ERRORS', errors });
    }
    return !hasErrors;
  }, [schema, state.values]);

  const reset = useCallback(
    (newInitialValues?: Record<string, unknown>) => {
      dispatch({
        type: 'RESET',
        values: buildInitialValues(schema, newInitialValues),
      });
    },
    [schema],
  );

  const getCoercedValues = useCallback((): Record<string, unknown> => {
    return coerceValues(schema, state.values);
  }, [schema, state.values]);

  return {
    values: state.values,
    errors: state.errors,
    setValue,
    validate,
    reset,
    getCoercedValues,
  };
}
