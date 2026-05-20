import { redirect } from 'next/navigation';

/**
 * Legacy URL: /code-reviews/all
 *
 * The old page (1700+ lines) duplicated the audit-tracking table that lives
 * on /code-reviews/suivi. Its only unique feature was the PDF export popover,
 * which has been promoted to the suivi PageHeader (see PdfExportButton).
 *
 * This file stays as a permanent redirect so external links (emails, bookmarks)
 * keep working.
 */
export default function CodeReviewsAllPage() {
  redirect('/code-reviews/suivi');
}
