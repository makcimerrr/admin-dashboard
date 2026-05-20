import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

/**
 * Legacy URL: /student?id=X
 *
 * The student-detail page lives at /students/[id] (matches the plural
 * /students list). This stays as a redirect so older deep-links — emails,
 * Discord pings, bookmarks — keep working.
 */
export default async function LegacyStudentPage({ searchParams }: PageProps) {
  const { id } = await searchParams;
  if (id) {
    redirect(`/students/${id}`);
  }
  redirect('/students');
}
