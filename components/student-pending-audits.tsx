'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, AlertCircle, ExternalLink, FileCode, Users } from 'lucide-react';
import Link from 'next/link';
import { trackChipStyle } from '@/lib/track-colors';

type PendingAudit = {
  projectName: string;
  track: string;
  groupId: string;
  status: string;
  promoId: string;
  promoName: string;
  members: { login: string; firstName?: string; lastName?: string }[];
};

interface StudentPendingAuditsProps {
  studentId: number;
}

export function StudentPendingAudits({ studentId }: StudentPendingAuditsProps) {
  const [pendingAudits, setPendingAudits] = useState<PendingAudit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/student/${studentId}/pending-audits`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.success) setPendingAudits(data.pendingAudits);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [studentId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingAudits.length === 0) {
    return null; // Ne rien afficher si pas d'audits en attente
  }

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Audits en attente
        </CardTitle>
        <CardDescription>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-primary" />
            {pendingAudits.length} projet{pendingAudits.length > 1 ? 's' : ''} terminé
            {pendingAudits.length > 1 ? 's' : ''} en attente de code review
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingAudits.map((audit, idx) => (
            <div
              key={`${audit.groupId}-${idx}`}
              className="p-3 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted/5 rounded-lg">
                    <FileCode className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{audit.projectName}</span>
                      <Badge variant="outline" style={trackChipStyle(audit.track)}>
                        {audit.track}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Groupe #{audit.groupId} • {audit.promoName}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="group transition">
                  <Link href={`/code-reviews/${audit.promoId}/group/${audit.groupId}/audit`} className="flex items-center gap-1 transition-transform group-hover:translate-x-1">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    <span className="text-sm">Auditer</span>
                  </Link>
                </Button>
              </div>
              {audit.members.length > 0 && (
                <div className="flex items-center gap-2 ml-12 mt-2">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <div className="flex flex-wrap gap-1">
                    {audit.members.map((member, mIdx) => (
                      <Badge
                        key={`${member.login}-${mIdx}`}
                        variant="secondary"
                        className="text-xs font-normal transition-colors hover:bg-primary/10 rounded-md px-2 py-0.5 cursor-default"
                      >
                        {member.firstName && member.lastName
                          ? `${member.firstName} ${member.lastName}`
                          : member.login}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
