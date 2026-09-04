export type Language = 'lotin' | 'kirill' | 'rus';

export type EmergencyCategory =
  | 'gas_leak'
  | 'fire'
  | 'smoke'
  | 'electric_shock'
  | 'unconscious'
  | 'bleeding'
  | 'accident'
  | 'drowning'
  | 'crime'
  | 'missing_child'
  | 'water_pipe'
  | 'power_outage'
  | 'stuck_elevator'
  | 'heating_issue'
  | 'hot_water_outage'
  | 'cold_water_outage';

export interface EmergencyTemplateData {
  category: EmergencyCategory;
  level: 1 | 2;
  keywords: string[];
  templates: Record<Language, string>;
}
