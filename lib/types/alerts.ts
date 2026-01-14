export type Alert = {
  id: string;
  type: 'danger' | 'warning' | 'info';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  studentId?: number;
  studentName?: string;
  promoKey?: string;
  count?: number;
  action?: string;
};
