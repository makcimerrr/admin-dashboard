import { db } from '../config';
import { history, History } from '../schema/history';
import { users } from '../schema/users';
import { employees } from '../schema/employees';
import { students } from '../schema/students';
import { eq, and, desc, inArray } from 'drizzle-orm';

export async function addHistoryEntry(entry: Omit<History, 'id' | 'date'> & { date?: Date }) {
  const now = entry.date || new Date();
  await db.insert(history).values({ ...entry, date: now });
}

export async function getHistory({ type, userId, action, limit = 100 }: { type?: string; userId?: string; action?: string; limit?: number }) {
  let whereClauses = [];
  if (type) whereClauses.push(eq(history.type, type));
  if (userId) whereClauses.push(eq(history.userId, userId));
  if (action) whereClauses.push(eq(history.action, action));
  const where = whereClauses.length > 0 ? and(...whereClauses) : undefined;
  const rows = await db.select().from(history)
    .where(where)
    .orderBy(desc(history.date))
    .limit(limit);

  return rows;
}

export interface EnrichedHistory extends History {
  userName: string | null;
  userRole: string | null;
  userPlanningPermission: string | null;
  entityLabel: string | null;
  entityExtra: string | null;
}

export async function getEnrichedHistory({ type, userId, action, limit = 100 }: { type?: string; userId?: string; action?: string; limit?: number }): Promise<EnrichedHistory[]> {
  const rows = await getHistory({ type, userId, action, limit });
  if (rows.length === 0) return [];

  // Batch resolve users by userId (Stack Auth IDs stored in userId field)
  // userEmail is already stored in the history table, use it directly
  const userEmails = [...new Set(rows.map(r => r.userEmail).filter(Boolean))];
  const userRows = userEmails.length > 0
    ? await db.select({ email: users.email, name: users.name, role: users.role, planningPermission: users.planningPermission }).from(users).where(inArray(users.email, userEmails))
    : [];
  const userMap = new Map(userRows.map(u => [u.email, u]));

  // Batch resolve entity labels by type
  const employeeIds = rows.filter(r => r.type === 'employee' && r.entityId).map(r => r.entityId);
  const studentIds = rows.filter(r => r.type === 'student' && r.entityId).map(r => r.entityId);

  // Resolve employees (employees.id is UUID string)
  const empMap = new Map<string, { name: string; email: string; role: string | null }>();
  if (employeeIds.length > 0) {
    const uniqueIds = [...new Set(employeeIds)];
    if (uniqueIds.length > 0) {
      const empRows = await db.select({ id: employees.id, name: employees.name, email: employees.email, role: employees.role })
        .from(employees).where(inArray(employees.id, uniqueIds));
      empRows.forEach(e => empMap.set(String(e.id), { name: e.name, email: e.email, role: e.role }));
    }
  }

  // Resolve students
  const stuMap = new Map<string, { firstName: string; lastName: string; login: string; promo: string }>();
  if (studentIds.length > 0) {
    const numericIds = studentIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (numericIds.length > 0) {
      const stuRows = await db.select({ id: students.id, firstName: students.first_name, lastName: students.last_name, login: students.login, promo: students.promoName })
        .from(students).where(inArray(students.id, numericIds));
      stuRows.forEach(s => stuMap.set(String(s.id), { firstName: s.firstName, lastName: s.lastName, login: s.login, promo: s.promo }));
    }
  }

  // Also resolve employee names from planning/absence entries
  const planningEmpIds = rows
    .filter(r => (r.type === 'planning' || r.type === 'absence') && r.details)
    .map(r => {
      const d = (r.details as any)?.after || (r.details as any)?.before || r.details;
      return d?.employeeId;
    })
    .filter(Boolean);

  if (planningEmpIds.length > 0) {
    const uniqueIds = [...new Set(planningEmpIds as string[])].filter(id => !empMap.has(id));
    if (uniqueIds.length > 0) {
      const empRows = await db.select({ id: employees.id, name: employees.name, email: employees.email, role: employees.role })
        .from(employees).where(inArray(employees.id, uniqueIds));
      empRows.forEach(e => empMap.set(String(e.id), { name: e.name, email: e.email, role: e.role }));
    }
  }

  return rows.map(row => {
    const user = userMap.get(row.userEmail);
    let entityLabel: string | null = null;
    let entityExtra: string | null = null;

    if (row.type === 'employee') {
      const emp = empMap.get(row.entityId);
      if (emp) { entityLabel = `${emp.name} (${emp.email})`; entityExtra = emp.role; }
    } else if (row.type === 'student') {
      const stu = stuMap.get(row.entityId);
      if (stu) { entityLabel = `${stu.firstName} ${stu.lastName} (${stu.login})`; entityExtra = stu.promo; }
    } else if (row.type === 'planning' || row.type === 'absence') {
      const d = (row.details as any)?.after || (row.details as any)?.before || row.details;
      if (d?.employeeId) {
        const emp = empMap.get(String(d.employeeId));
        const empName = emp?.name || d.employeeId;
        entityLabel = `Planning de ${empName} – ${d.day || '?'} (${d.weekKey || '?'})`;
        entityExtra = d.timeSlots ? `${d.timeSlots.length} créneau(x)` : null;
      }
    }

    return {
      ...row,
      userName: user?.name || null,
      userRole: user?.role || null,
      userPlanningPermission: user?.planningPermission || null,
      entityLabel,
      entityExtra,
    };
  });
}
