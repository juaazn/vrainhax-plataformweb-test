"use client";

import { useConfigForm } from '@/lib/hooks/use-config-form';
import type { JsonSchema7 } from '@/types/api/variant.types';

export interface DynamicConfigFormProps {
  schema: JsonSchema7;
  initialValues?: Record<string, unknown>;
  onSubmit: (config: Record<string, unknown>) => void;
  onCancel?: () => void;
  submitLabel?: string;
  disabled?: boolean;
}

interface FieldProps {
  fieldKey: string;
  fieldSchema: JsonSchema7;
  value: unknown;
  error: string;
  required: boolean;
  disabled: boolean;
  onChange: (key: string, value: unknown) => void;
}

function FieldInput({ fieldKey, fieldSchema, value, error, required, disabled, onChange }: FieldProps) {
  const type = Array.isArray(fieldSchema.type) ? fieldSchema.type[0] : fieldSchema.type;
  const label = fieldSchema.title ?? fieldKey;

  const baseInputClass =
    'mt-1 block w-full rounded border px-3 py-1.5 text-sm ' +
    (error
      ? 'border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400'
      : 'border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500');

  let inputElement: React.ReactNode;

  if (type === 'boolean') {
    inputElement = (
      <div className="mt-1 flex items-center gap-2">
        <input
          id={fieldKey}
          type="checkbox"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(e) => onChange(fieldKey, e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor={fieldKey} className="text-sm text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      </div>
    );

    return (
      <div className="space-y-0.5">
        {inputElement}
        {fieldSchema.description && (
          <small className="block text-xs text-slate-500">{fieldSchema.description}</small>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if ((type === 'string' || type === undefined) && Array.isArray(fieldSchema.enum)) {
    inputElement = (
      <select
        id={fieldKey}
        value={String(value ?? '')}
        disabled={disabled}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className={baseInputClass}
      >
        {fieldSchema.enum.map((opt) => (
          <option key={String(opt)} value={String(opt)}>
            {String(opt)}
          </option>
        ))}
      </select>
    );
  } else if (type === 'number' || type === 'integer') {
    inputElement = (
      <input
        id={fieldKey}
        type="number"
        value={String(value ?? '')}
        min={fieldSchema.minimum}
        max={fieldSchema.maximum}
        step={type === 'integer' ? 1 : undefined}
        disabled={disabled}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className={baseInputClass}
      />
    );
  } else {
    inputElement = (
      <input
        id={fieldKey}
        type="text"
        value={String(value ?? '')}
        disabled={disabled}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className={baseInputClass}
      />
    );
  }

  return (
    <div className="space-y-0.5">
      <label htmlFor={fieldKey} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {inputElement}
      {fieldSchema.description && (
        <small className="block text-xs text-slate-500">{fieldSchema.description}</small>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function DynamicConfigForm({
  schema,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Submit',
  disabled = false,
}: DynamicConfigFormProps) {
  const { values, errors, setValue, validate, getCoercedValues } = useConfigForm(
    schema,
    initialValues,
  );

  const properties = schema.properties ?? {};
  const required = schema.required ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(getCoercedValues());
  }

  const hasProperties = Object.keys(properties).length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {schema.title && (
        <h3 className="text-base font-semibold text-slate-800">{schema.title}</h3>
      )}
      {schema.description && (
        <p className="text-sm text-slate-500">{schema.description}</p>
      )}

      {hasProperties ? (
        <div className="space-y-3">
          {Object.entries(properties).map(([key, fieldSchema]) => (
            <FieldInput
              key={key}
              fieldKey={key}
              fieldSchema={fieldSchema}
              value={values[key]}
              error={errors[key] ?? ''}
              required={required.includes(key)}
              disabled={disabled}
              onChange={setValue}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">No configurable fields.</p>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={disabled}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            disabled={disabled}
            onClick={onCancel}
            className="rounded border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
