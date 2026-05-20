import { redirect } from 'next/navigation';

/**
 * Legacy URL: /assistant/settings — orphan page (no sidebar entry).
 * Its content (stats, RAG status, data management, about Nova) now
 * lives as a tab on /settings.
 */
export default function LegacyAssistantSettingsPage() {
  redirect('/settings?tab=nova');
}
