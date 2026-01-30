"use client";

import React, { useState } from "react";
import GlobalWarningsEditor from "./global-warnings-editor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Eye, EyeOff, FileText } from 'lucide-react';
import MarkdownWithTables from './markdown-with-tables';

type Member = {
  id: number;
  studentLogin: string;
  validated: boolean;
  feedback?: string | null;
  warnings?: string[];
};

type Props = {
  auditId: number;
  promoId: string;
  groupId: string;
  projectName: string;
  promoKey?: string;
  initialSummary?: string | null;
  initialGlobalWarnings?: string[];
  members: Member[];
  otherAudits?: { auditId: number; groupId: string; projectName: string }[];
};

export default function AuditEditForm({
  auditId,
  promoId,
  groupId,
  projectName,
  promoKey,
  initialSummary = "",
  initialGlobalWarnings = [],
  members,
  otherAudits = [],
}: Props) {
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [globalWarnings, setGlobalWarnings] = useState<string[]>(initialGlobalWarnings);
  const [results, setResults] = useState<Member[]>(members);
  const [saving, setSaving] = useState(false);
  const [summaryPreviewOpen, setSummaryPreviewOpen] = useState(false);

  // preview state per student login
  const [previewMap, setPreviewMap] = useState<Record<string, boolean>>({});
  const togglePreview = (login: string) => {
    setPreviewMap(prev => ({ ...prev, [login]: !prev[login] }));
  };

  const updateMember = (login: string, patch: Partial<Member>) => {
    setResults((prev) => prev.map((m) => (m.studentLogin === login ? { ...m, ...patch } : m)));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/code-reviews/audit/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditId,
          promoId,
          groupId,
          summary,
          warnings: globalWarnings.filter(Boolean),
          results: results.map((r) => ({
            studentLogin: r.studentLogin,
            validated: r.validated,
            feedback: r.feedback ?? null,
            warnings: r.warnings ?? [],
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        const message = err?.error || "Erreur lors de la sauvegarde";
        toast({ title: "Erreur", description: message });
        setSaving(false);
        return;
      }

      toast({ title: "Audit enregistré", description: "Les modifications ont été sauvegardées." });
      // redirect client-side
      window.location.href = `/code-reviews/${promoId}/group/${groupId}`;
    } catch (error: any) {
      toast({ title: "Erreur", description: error?.message ?? "Erreur inconnue" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Modifier l'audit</h1>
            <p className="text-muted-foreground">{projectName} • Groupe #{groupId} • {promoKey}</p>
          </div>
          {/* quick audits selector */}
          {otherAudits.length > 0 && (
            <div className="ml-4">
              <label className="sr-only">Autres audits</label>
              <select
                defaultValue=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  // value format: auditId::groupId
                  const [aid, gid] = val.split('::');
                  window.location.href = `/code-reviews/${promoId}/group/${gid}/audit`;
                }}
                className="rounded-md border px-2 py-1 text-sm"
              >
                <option value="">Ouvrir un autre audit…</option>
                {otherAudits.map(o => (
                  <option key={o.auditId} value={`${o.auditId}::${o.groupId}`}>{o.projectName} • #{o.groupId}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.location.href = `/code-reviews/${promoId}/group/${groupId}`}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2">Résumé</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setSummaryPreviewOpen(prev => !prev)} className="text-sm text-muted-foreground flex items-center gap-2">
                {summaryPreviewOpen ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                <span>{summaryPreviewOpen ? 'Masquer aperçu' : 'Aperçu'}</span>
              </button>
            </div>
          </div>
          {summaryPreviewOpen ? (
            <div className="p-3 rounded-md bg-muted/10 border">
              <MarkdownWithTables md={summary} />
            </div>
          ) : (
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={8} />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Warnings globaux</label>
          <GlobalWarningsEditor value={globalWarnings} onChange={setGlobalWarnings} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium mb-2">Évaluation individuelle</h2>
        <div className="space-y-4">
          {results.map((r) => (
            <div key={r.studentLogin} className="p-4 rounded-lg border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="font-medium">{r.studentLogin}</span></div>
                <div className="flex items-center gap-2">
                  <label className="text-sm">Validé</label>
                  <Switch
                    checked={r.validated}
                    onCheckedChange={(checked: boolean) => updateMember(r.studentLogin, { validated: checked })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm block mb-1">Feedback</label>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => togglePreview(r.studentLogin)} aria-label="Aperçu">
                    {previewMap[r.studentLogin] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {previewMap[r.studentLogin] ? (
                <div className="p-3 rounded-md bg-muted/10 border">
                  <MarkdownWithTables md={r.feedback} />
                </div>
              ) : (
                <Textarea value={r.feedback ?? ""} onChange={(e) => updateMember(r.studentLogin, { feedback: e.target.value })} rows={4} />
              )}

              <div>
                <label className="text-sm block mb-1">Warnings (un par ligne)</label>
                <Textarea value={(r.warnings ?? []).join('\n')} onChange={(e) => updateMember(r.studentLogin, { warnings: e.target.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean) })} rows={2} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
