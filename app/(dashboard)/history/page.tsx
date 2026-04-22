"use client";

import { useEffect, useState } from "react";
import { useUser } from "@stackframe/stack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, Loader2, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FilterToolbar } from "@/components/planning/filter-toolbar";

interface HistoryEntry {
  id: number;
  type: string;
  action: string;
  userId: string;
  userEmail: string;
  date: string;
  entityId: string;
  details: any;
  // Enriched fields from server
  userName: string | null;
  userRole: string | null;
  userPlanningPermission: string | null;
  entityLabel: string | null;
  entityExtra: string | null;
}

export default function HistoryPage() {
  const stackUser = useUser();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [action, setAction] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const planningPermission = stackUser
    ? ((stackUser.clientReadOnlyMetadata?.planningPermission ||
       stackUser.clientMetadata?.planningPermission ||
       'reader') as string)
    : 'reader';

  useEffect(() => {
    setLoading(true);
    let url = "/api/history?limit=100";
    if (type) url += `&type=${encodeURIComponent(type)}`;
    if (action) url += `&action=${encodeURIComponent(action)}`;
    if (userEmail) url += `&userId=${encodeURIComponent(userEmail)}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => setHistory(data))
      .finally(() => setLoading(false));
  }, [type, action, userEmail]);

  if (planningPermission !== "editor") {
    return <div className="p-8 text-center text-lg font-bold text-yellow-700 dark:text-yellow-400">Accès réservé aux éditeurs.</div>;
  }

  function renderUserInfo(entry: HistoryEntry) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold">{entry.userName || entry.userEmail}</span>
        <span className="text-[10px] text-muted-foreground">{entry.userEmail}</span>
        <div className="flex gap-1 mt-0.5">
          {entry.userRole && <Badge variant={entry.userRole === 'admin' ? 'default' : 'outline'} className="text-[9px] px-1 py-0 h-4">{entry.userRole}</Badge>}
          {entry.userPlanningPermission && <Badge variant={entry.userPlanningPermission === 'editor' ? 'default' : 'outline'} className="text-[9px] px-1 py-0 h-4">{entry.userPlanningPermission}</Badge>}
        </div>
      </div>
    );
  }

  function renderEntityInfo(entry: HistoryEntry) {
    if (!entry.entityLabel) {
      return <span className="italic text-muted-foreground text-[10px]">{entry.entityId?.slice(0, 8)}...</span>;
    }
    return (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{entry.entityLabel}</span>
        {entry.entityExtra && <span className="text-[10px] text-muted-foreground">{entry.entityExtra}</span>}
      </div>
    );
  }

  function renderDetails(details: any) {
    if (!details) return null;
    if (typeof details !== 'object') return <span>{String(details)}</span>;
    if (details.before || details.after) {
      const before = details.before || {};
      const after = details.after || {};
      const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
      return (
        <div className="flex flex-col gap-1">
          {allKeys.map(key => {
            if (JSON.stringify(before[key]) === JSON.stringify(after[key])) return null;
            return (
              <div key={key} className="flex gap-1.5 items-start">
                <span className="font-semibold min-w-[60px] text-muted-foreground">{key}</span>
                <span className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded px-1.5 py-0.5 text-red-700 dark:text-red-400 break-all max-w-[150px]">
                  {before[key] === undefined ? "" : JSON.stringify(before[key])}
                </span>
                <span className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded px-1.5 py-0.5 text-green-700 dark:text-green-400 break-all max-w-[150px]">
                  {after[key] === undefined ? "" : JSON.stringify(after[key])}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    if (Array.isArray(details)) {
      return (
        <ul className="list-disc pl-3">
          {details.map((item, i) => <li key={i}>{JSON.stringify(item)}</li>)}
        </ul>
      );
    }
    return (
      <ul className="list-disc pl-3">
        {Object.entries(details).map(([k, v]) => (
          <li key={k}><span className="font-semibold">{k}:</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] p-2 md:p-3 gap-2 overflow-hidden">
      <PageHeader
        icon={Clock}
        title="Historique"
        description="Suivi des modifications du planning"
        badge={<Badge variant="outline" className={planningPermission === 'editor' ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'}>{planningPermission === 'editor' ? 'EDITOR' : 'READER'}</Badge>}
      />

      <FilterToolbar>
        <Input placeholder="Type..." value={type} onChange={e => setType(e.target.value)} className="h-8 w-36 text-xs" />
        <Input placeholder="Action..." value={action} onChange={e => setAction(e.target.value)} className="h-8 w-36 text-xs" />
        <Input placeholder="Email utilisateur..." value={userEmail} onChange={e => setUserEmail(e.target.value)} className="h-8 w-48 text-xs" />
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => { setType(""); setAction(""); setUserEmail(""); }}>
          <RotateCcw className="h-3 w-3" />
          Réinitialiser
        </Button>
      </FilterToolbar>

      <div className="flex-1 min-h-0 overflow-auto rounded-lg border bg-background">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
              <tr className="border-b">
                <th className="p-2 text-left text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Date</th>
                <th className="p-2 text-left text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Type</th>
                <th className="p-2 text-left text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Action</th>
                <th className="p-2 text-left text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Utilisateur</th>
                <th className="p-2 text-left text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Cible</th>
                <th className="p-2 text-left text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Détails</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Aucune action trouvée.</td></tr>
              ) : history.map(entry => (
                <tr key={entry.id} className="border-b hover:bg-muted/30 align-top">
                  <td className="p-2 whitespace-nowrap font-mono text-[10px] text-muted-foreground">{format(new Date(entry.date), "dd/MM/yy HH:mm", { locale: fr })}</td>
                  <td className="p-2"><Badge className="text-[9px] px-1.5 py-0 h-4">{entry.type}</Badge></td>
                  <td className="p-2"><Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{entry.action}</Badge></td>
                  <td className="p-2">{renderUserInfo(entry)}</td>
                  <td className="p-2 max-w-[200px]">{renderEntityInfo(entry)}</td>
                  <td className="p-2 max-w-[250px]">{renderDetails(entry.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
