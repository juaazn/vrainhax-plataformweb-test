export interface VariantSummaryDTO {
  variant_id: string;
  variant_code: string;
  name: string;
  description: string | null;
  score_unit: string | null;
  active: boolean;
}

export interface ModuleDTO {
  module_id: string;
  module_code: string;
  name: string;
  description: string | null;
  type: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  variants?: VariantSummaryDTO[];
}

export interface ModuleSummaryDTO {
  module_id: string;
  module_code: string;
  name: string;
}

export interface ModuleListParams {
  active?: boolean;
}
