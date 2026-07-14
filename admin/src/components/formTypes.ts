export interface SelectOption {
  label: string;
  value: string | number;
}

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "decimal"
  | "boolean"
  | "select"
  | "date"
  | "json"
  | "image";

export interface ResourceOptionSource {
  endpoint: string;
  labelKey: string;
  valueKey?: string;
}

export interface FormFieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: SelectOption[];
  optionsResource?: ResourceOptionSource;
  placeholder?: string;
  helpText?: string;
}
