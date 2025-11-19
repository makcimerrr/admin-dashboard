"use client";
import { useEffect, useState } from "react";
import { useUser } from "@stackframe/stack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, Users, LayoutTemplate, Calendar } from "lucide-react";
import Link from "next/link";
import { PlanningNavigation } from '@/components/planning/planning-navigation';

interface HistoryEntry {
  id: number;
  type: string;
  action: string;
  userId: string;
  userEmail: string;
  date: string;
  entityId: string;
  details: any;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  planningPermission: string;
}

interface EntityInfo {
  id: string;
  label: string;
  extra?: string;
}

export default function HistoryPage() {
  const stackUser = useUser();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [action, setAction] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userMap, setUserMap] = useState<Record<string, UserInfo>>({});
  const [entityMap, setEntityMap] = useState<Record<string, EntityInfo>>({});

  // Fetch history and user/entity info
  useEffect(() => {
    setLoading(true);
    let url = "/api/history?limit=100";
    if (type) url += `&type=${encodeURIComponent(type)}`;
    if (action) url += `&action=${encodeURIComponent(action)}`;
    if (userEmail) url += `&userId=${encodeURIComponent(userEmail)}`;
    fetch(url)
      .then((res) => res.json())
      .then(async (data) => {
        setHistory(data);
        // Récupérer tous les userId uniques
        const userIds = Array.from(new Set(data.map((h: HistoryEntry) => h.userId).filter(Boolean)));
        // Appel API pour chaque userId (en parallèle)
        const userResults = await Promise.all(userIds.map(async (id) => {
          try {
            const res = await fetch(`/api/users/${id}`);
            if (!res.ok) return null;
            const user = await res.json();
            return { id, ...user };
          } catch {
            return null;
          }
        }));
        const userMapObj: Record<string, UserInfo> = {};
        userResults.forEach(u => { if (u && u.id) userMapObj[u.id] = u; });
        setUserMap(userMapObj);

        // Récupérer les entités cibles (planning, employee, project, promo, student...)
        const entityFetches = data.map(async (entry: HistoryEntry) => {
          if (!entry.entityId) return null;
          let label = entry.entityId;
          let extra = "";
          try {
            if (entry.type === "employee") {
              const res = await fetch(`/api/employees/${entry.entityId}`);
              if (res.ok) {
                const emp = await res.json();
                label = `${emp.name} (${emp.email})`;
                extra = emp.role;
              }
            } else if (entry.type === "planning" || entry.type === "absence") {
              // On tente d'afficher l'employé + jour + semaine
              const details = entry.details?.after || entry.details?.before || entry.details;
              if (details && details.employeeId) {
                const empRes = await fetch(`/api/employees/${details.employeeId}`);
                let empName = details.employeeId;
                if (empRes.ok) {
                  const emp = await empRes.json();
                  empName = emp.name;
                }
                label = `Planning de ${empName} – ${details.day || "?"} (${details.weekKey || "?"})`;
                extra = details.timeSlots ? `${details.timeSlots.length} créneau(x)` : "";
              }
            } else if (entry.type === "project") {
              const res = await fetch(`/api/projects/${entry.entityId}`);
              if (res.ok) {
                const proj = await res.json();
                label = `Projet : ${proj.name}`;
                extra = proj.category;
              }
            } else if (entry.type === "promo") {
              const res = await fetch(`/api/promos/${entry.entityId}`);
              if (res.ok) {
                const promo = await res.json();
                label = `Promo : ${promo.name}`;
              }
            } else if (entry.type === "student") {
              const res = await fetch(`/api/students/${entry.entityId}`);
              if (res.ok) {
                const stu = await res.json();
                label = `Étudiant : ${stu.first_name} ${stu.last_name} (${stu.login})`;
                extra = stu.promos;
              }
            }
          } catch {}
          return { id: entry.entityId, label, extra };
        });
        const entityResults = await Promise.all(entityFetches);
        const entityMapObj: Record<string, EntityInfo> = {};
        entityResults.forEach(e => { if (e && e.id) entityMapObj[e.id] = e; });
        setEntityMap(entityMapObj);
      })
      .finally(() => setLoading(false));
  }, [type, action, userEmail]);

  // Get planning permission from Stack Auth user metadata
  const planningPermission = stackUser
    ? (stackUser.clientReadOnlyMetadata?.planningPermission ||
       stackUser.clientMetadata?.planningPermission ||
       'reader')
    : 'reader';

  // Restriction editor (après tous les hooks)
  if (planningPermission !== "editor") {
    return <div className="p-8 text-center text-lg font-bold text-yellow-700">Accès réservé aux éditeurs.</div>;
  }

  // Helper pour afficher les infos utilisateur
  function renderUserInfo(entry: HistoryEntry) {
    const user = userMap[entry.userId];
    if (!user) return <span className="italic text-muted-foreground">unknown</span>;
    return (
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold">{user.name || user.email}</span>
        <span className="text-xs text-muted-foreground">{user.email}</span>
        <span className="text-xs">
          <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>{user.role}</Badge>
          <Badge variant={user.planningPermission === 'editor' ? 'default' : 'outline'} className="ml-1">{user.planningPermission}</Badge>
        </span>
      </div>
    );
  }

  // Helper pour afficher la cible entité
  function renderEntityInfo(entry: HistoryEntry) {
    const entity = entityMap[entry.entityId];
    if (!entity) return <span className="italic text-muted-foreground">Inconnu ({entry.entityId})</span>;
    return (
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold">{entity.label}</span>
        {entity.extra && <span className="text-xs text-muted-foreground">{entity.extra}</span>}
      </div>
    );
  }

  // Helper pour afficher les détails (before/after) de façon buvable
  function renderDetails(details: any) {
    if (!details) return null;
    if (typeof details !== 'object') return <span>{String(details)}</span>;
    // Diff visuel pour before/after
    if (details.before || details.after) {
      const before = details.before || {};
      const after = details.after || {};
      // Champs modifiés
      const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
      return (
        <div className="flex flex-col gap-1 text-xs">
          {allKeys.map(key => {
            if (JSON.stringify(before[key]) === JSON.stringify(after[key])) return null;
            return (
              <div key={key} className="flex gap-2 items-start">
                <span className="font-semibold min-w-[80px]">{key}</span>
                <span className="bg-red-50 border border-red-200 rounded px-2 py-1 text-red-700 break-all max-w-[180px]">{before[key] === undefined ? "" : JSON.stringify(before[key])}</span>
                <span className="bg-green-50 border border-green-200 rounded px-2 py-1 text-green-700 break-all max-w-[180px]">{after[key] === undefined ? "" : JSON.stringify(after[key])}</span>
              </div>
            );
          })}
        </div>
      );
    }
    // Pour les tableaux (ex: timeSlots)
    if (Array.isArray(details)) {
      return (
        <ul className="list-disc pl-4 text-xs">
          {details.map((item, i) => <li key={i}>{JSON.stringify(item)}</li>)}
        </ul>
      );
    }
    // Pour les objets simples
    return (
      <ul className="list-disc pl-4 text-xs">
        {Object.entries(details).map(([k, v]) => (
          <li key={k}><span className="font-semibold">{k}:</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header moderne */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Clock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historique des actions</h1>
          <p className="text-muted-foreground">Suivez toutes les modifications du planning, des employés et des promos</p>
        </div>
      </div>

      {/* Navigation */}
      <PlanningNavigation planningPermission={planningPermission} />

      {/* Badge droits planning */}
      <div className="flex items-center gap-2">
        <span className="font-semibold">Droits planning :</span>
        <span className={`px-2 py-1 rounded text-xs font-bold ${planningPermission === 'editor' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {planningPermission === 'editor' ? 'EDITOR' : 'READER'}
        </span>
      </div>
      {/* Contenu principal dans un conteneur harmonisé */}
      <div className="rounded-lg border bg-background p-6">
        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Input placeholder="Type (planning, absence, employee...)" value={type} onChange={e => setType(e.target.value)} className="w-48" />
          <Input placeholder="Action (create, update, delete)" value={action} onChange={e => setAction(e.target.value)} className="w-48" />
          <Input placeholder="Email utilisateur" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="w-64" />
          <Button onClick={() => { setType(""); setAction(""); setUserEmail(""); }}>Réinitialiser</Button>
        </div>
        {loading ? (
          <div className="text-center py-12">Chargement...</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b">
                  <th className="p-2">Date</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Action</th>
                  <th className="p-2">Utilisateur</th>
                  <th className="p-2">Cible</th>
                  <th className="p-2">Détails</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8">Aucune action trouvée.</td></tr>
                ) : history.map(entry => (
                  <tr key={entry.id} className="border-b hover:bg-muted/50 align-top">
                    <td className="p-2 whitespace-nowrap font-mono text-xs">{format(new Date(entry.date), "dd/MM/yyyy HH:mm:ss", { locale: fr })}</td>
                    <td className="p-2"><Badge>{entry.type}</Badge></td>
                    <td className="p-2"><Badge variant="outline">{entry.action}</Badge></td>
                    <td className="p-2">{renderUserInfo(entry)}</td>
                    <td className="p-2">{renderEntityInfo(entry)}</td>
                    <td className="p-2 max-w-xs min-w-[200px]">{renderDetails(entry.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 