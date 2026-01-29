'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, AlertCircle, ExternalLink, FileCode, Users } from 'lucide-react';
import Link from 'next/link';

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

const getTrackColor = (track: string) => {
  switch (track) {
    case 'Golang':
      return 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20';
    case 'Javascript':
      return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
    case 'Rust':
      return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
    case 'Java':
      return 'bg-red-500/10 text-red-700 border-red-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
  }
};

export function StudentPendingAudits({ studentId }: StudentPendingAuditsProps) {
  const [pendingAudits, setPendingAudits] = useState<PendingAudit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPendingAudits = async () => {
      try {
        const response = await fetch(`/api/student/${studentId}/pending-audits`);
        if (response.ok) {
          const data = await response.json();
          console.log('[StudentPendingAudits] Response:', data);
          if (data.success) {
            setPendingAudits(data.pendingAudits);
            console.log('[StudentPendingAudits] Pending audits count:', data.pendingAudits.length);
          }
        } else {
          console.error('[StudentPendingAudits] HTTP error:', response.status);
        }
      } catch (error) {
        console.error('[StudentPendingAudits] Error fetching pending audits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingAudits();
  }, [studentId]);

  if (loading) {
    return (
      <Card className="border-2">
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
    <Card className="border-2 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-600" />
          Audits en attente
        </CardTitle>
        <CardDescription>
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="h-4 w-4" />
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
              className="p-3 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                    <FileCode className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{audit.projectName}</span>
                      <Badge variant="outline" className={getTrackColor(audit.track)}>
                        {audit.track}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Groupe #{audit.groupId} • {audit.promoName}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/code-reviews/${audit.promoId}/group/${audit.groupId}/audit`}>
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Auditer
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
                        className="text-xs font-normal"
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
