'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface Project {
  id: number;
  name: string;
  project_time_week: number;
  count: number;
  percentage: number;
}

interface Meta {
  totalStudents: number;
  aheadCount: number;
  aheadPercentage: number;
}

interface PromoData {
  success: boolean;
  promotionName: string;
  language: string;
  currentProject: string;
  projects: Project[];
  meta: Meta;
}

const PROMOS = [
  { id: '148', name: 'P1 2023' },
  { id: '216', name: 'P2 2023' },
  { id: '303', name: 'P1 2024' },
  { id: '32', name: 'P1 2022' },
  { id: '526', name: 'P1 2025' },
  { id: '904', name: 'P2 2025' },
];

export default function PromoWidget() {
  const [promoId, setPromoId] = useState<string>('');
  const [data, setData] = useState<PromoData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!promoId) {
      setData(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    async function fetchPromoData() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/promotions/${promoId}/projects/last-three`,
          {
            signal: controller.signal
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: PromoData = await res.json();
        setData(json);
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          // request was aborted — ignore
          return;
        }
        console.error(err);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchPromoData();
    return () => controller.abort();
  }, [promoId]);

  function handleSelect(value: string) {
    // useTransition to keep UI responsive while fetching
    startTransition(() => {
      setPromoId(value);
    });
  }

  return (
    <Card className="w-full max-w-lg bg-card text-card-foreground">
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-sm">Promotion overview</CardTitle>

          <div className="flex flex-col items-end">
            <Label className="text-xs mb-1">Select promo</Label>
            <Select value={promoId} onValueChange={handleSelect}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Choose a promo" />
              </SelectTrigger>
              <SelectContent>
                {PROMOS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {isPending || loading ? (
            <div className="flex gap-2 items-center">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
          ) : data ? (
            <div className="flex gap-3 items-center">
              <span className="font-medium">{data.promotionName}</span>
              <Badge variant="secondary">{data.language}</Badge>
              <span className="text-sm text-muted-foreground">
                Current: {data.currentProject}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">No data</span>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent>
        {loading && !data ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : data && data.projects?.length ? (
          <div className="space-y-4">
            {data.projects.map((project) => {
              const pct = Math.max(0, Math.min(100, Math.round(project.percentage)));
              return (
                <div key={project.id} className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <div className="text-sm font-medium">{project.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{pct}%</span>
                      <span className="text-xs">({project.count})</span>
                    </div>
                  </div>

                  <Progress value={pct} className="h-2 rounded" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-muted-foreground">No projects available</div>
        )}

        <Separator className="my-4" />

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Total students</span>
            <span className="font-semibold">{data?.meta?.totalStudents ?? 0}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Students ahead</span>
            <span className="font-semibold">{data?.meta?.aheadCount ?? 0}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">% ahead</span>
            <span className="font-semibold">{data?.meta?.aheadPercentage ?? 0}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}