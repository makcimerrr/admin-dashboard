export type AlertCategory = 'code-reviews' | 'retards' | 'emargement' | 'other';

export type Alert = {
  id: string;
  type: 'danger' | 'warning' | 'info';
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: AlertCategory;
  title: string;
  description: string;
  studentId?: number;
  studentName?: string;
  promoKey?: string;
  count?: number;
  action?: string;
};
