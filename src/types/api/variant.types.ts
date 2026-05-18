import type { ModuleSummaryDTO } from './module.types';

export interface JsonSchema7 {
  $schema?: string;
  type?: string | string[];
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema7>;
  required?: string[];
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  default?: unknown;
  additionalProperties?: boolean | JsonSchema7;
  items?: JsonSchema7;
  [key: string]: unknown;
}

export interface MetricDefinitionDTO {
  key: string;
  label: string;
  type: 'number' | 'integer' | 'string' | 'boolean';
  unit?: string;
  range?: [number, number];
  description?: string;
}

export interface VariantCommandDTO {
  variant_command_id: string;
  command_name: string;
  label: string;
  parameter_schema: JsonSchema7;
  description: string | null;
  active: boolean;
  sort_order: number;
}

export interface VariantSchemaDTO {
  variant_id: string;
  variant_code: string;
  name: string;
  description: string | null;
  score_unit: string | null;
  active: boolean;
  module: ModuleSummaryDTO;
  config_schema: JsonSchema7;
  metrics_schema: MetricDefinitionDTO[];
  realtime_events: string[];
  commands: VariantCommandDTO[];
}

export interface VariantListParams {
  active?: boolean;
}
