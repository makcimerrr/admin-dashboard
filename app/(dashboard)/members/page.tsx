import { redirect } from 'next/navigation';
import { stackServerApp } from '@/lib/stack-server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { getUserRole } from '@/lib/stack-helpers';
import { isAdminRole } from '@/lib/nav-apps';
import MemberManagement from './member-management';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  // Gate admin côté serveur (même logique que app/(dashboard)/layout.tsx)
  let role: string | null = null;
  let currentUserId = '';

  const stackUser = await stackServerApp.getUser();
  if (stackUser) {
    role = getUserRole(stackUser);
    currentUserId = stackUser.id;
  } else {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const groups: string[] = (session.user.groups || []) as string[];
      role = groups.includes('authentik Admins') ? 'Admin' : 'user';
      currentUserId = session.user.id ?? '';
    }
  }

  if (!role) redirect('/login');
  if (!isAdminRole(role)) redirect('/');

  return (
    <div className="p-4 md:p-6">
      <MemberManagement currentUserId={currentUserId} />
    </div>
  );
}
