import { getAllPromoStatus } from './db/services/promoStatus';

export async function getPromoStatus() {
  const rows = await getAllPromoStatus();
  const result: Record<string, any> = {};
  for (const row of rows) {
    let project = row.currentProject;
    if (project) {
      try { project = JSON.parse(project); } catch { /* keep as string */ }
    }
    result[row.promoKey] = project;
  }
  return result;
}
