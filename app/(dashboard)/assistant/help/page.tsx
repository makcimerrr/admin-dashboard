import { redirect } from 'next/navigation';

/**
 * Legacy URL: /assistant/help — orphan documentation page.
 * The essentials ("about Nova" + capabilities) live in /settings under the
 * Nova tab. The conversational assistant explains its own features when
 * you ask it.
 */
export default function LegacyAssistantHelpPage() {
  redirect('/settings?tab=nova');
}
