import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/db/config';
import { audits, auditResults } from '@/lib/db/schema/audits';
import { eq } from 'drizzle-orm';
import GlobalWarningsEditor from '@/components/code-reviews/global-warnings-editor';
import AuditEditForm from '@/components/code-reviews/audit-edit-form';
import { parsePromoId } from '@/lib/config/promotions';

interface PageProps {
  params: Promise<{ promoId: string; groupId: string }>;
}

export default async function AuditEditPage({ params }: PageProps) {
  const { promoId, groupId } = await params;
  const promo = parsePromoId(promoId);

  if (!promo) notFound();

  const audit = await db.query.audits.findFirst({
    where: eq(audits.groupId, groupId),
    with: { results: true }
  });

  if (!audit) notFound();

  async function updateAudit(formData: FormData) {
    'use server';

    // Récupérer les identifiants depuis le formulaire (évite les closures)
    const auditIdRaw = formData.get('auditId')?.toString();
    const promoIdFromForm = formData.get('promoId')?.toString();
    const groupIdFromForm = formData.get('groupId')?.toString();

    if (!auditIdRaw) {
      notFound();
      return;
    }

    const auditIdNum = Number(auditIdRaw);
    const audit = await db.query.audits.findFirst({
      where: eq(audits.id, auditIdNum),
      with: { results: true }
    });

    if (!audit) {
      notFound();
      return;
    }

    const summary = formData.get('summary')?.toString() ?? null;
    const globalWarnings = formData
      .getAll('globalWarnings')
      .map(String)
      .filter(Boolean);

    // Construire les résultats individuels à partir du formulaire
    const resultsData = audit.results.map((r) => {
      const login = r.studentLogin;
      const validatedRaw = formData.get(`validated-${login}`);
      const validated = String(validatedRaw) === 'true';
      const feedbackRaw = formData.get(`feedback-${login}`);
      const feedback = feedbackRaw ? feedbackRaw.toString() : null;
      const warningsRaw = formData.get(`warnings-${login}`)?.toString() ?? '';
      // Split par nouvelle ligne et filtrer
      const warnings = warningsRaw
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);

      return {
        auditId: audit.id,
        studentLogin: login,
        validated,
        feedback,
        warnings
      };
    });

    // Mettre à jour l'audit principal
    await db
      .update(audits)
      .set({
        summary,
        warnings: globalWarnings,
        updatedAt: new Date()
      })
      .where(eq(audits.id, audit.id));

    // Remplacer les résultats individuels (delete then insert)
    await db.delete(auditResults).where(eq(auditResults.auditId, audit.id));

    if (resultsData.length > 0) {
      await db.insert(auditResults).values(resultsData);
    }

    // Rediriger vers la page du groupe avec un indicateur de succès
    const redirectPromo = promoIdFromForm ?? promoId;
    const redirectGroup = groupIdFromForm ?? groupId;
    redirect(`/code-reviews/${redirectPromo}/group/${redirectGroup}?saved=1`);
  }

  return (
    <AuditEditForm
      auditId={Number(audit.id)}
      promoId={promoId}
      groupId={groupId}
      projectName={audit.projectName}
      promoKey={promo.key}
      initialSummary={audit.summary ?? ''}
      initialGlobalWarnings={(audit.warnings ?? []) as string[]}
      members={audit.results.map((r) => ({
        id: r.id,
        studentLogin: r.studentLogin,
        validated: !!r.validated,
        feedback: r.feedback ?? null,
        warnings: r.warnings ?? []
      }))}
    />
  );
}
