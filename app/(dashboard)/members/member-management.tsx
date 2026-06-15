'use client';

import { useEffect, useState } from 'react';
import { useData } from '@/lib/client-cache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingCard } from '@/components/ui/loading-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  UserPlus,
  Pencil,
  Trash2,
  Loader2,
  Mail,
  KeyRound,
  Clock,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

type AuthMethod = 'google' | 'password' | 'sso' | 'autre';

interface Member {
  email: string;
  displayName: string | null;
  role: string;
  planningPermission: string;
  sources: { stack: boolean; local: boolean };
  stackId?: string;
  authMethod: AuthMethod;
  signedUpAt: string | null;
  lastActiveAt: string | null;
  isPending: boolean;
}

type ApiEnvelope<T> = { success: true; data: T } | { success: false; error: { message: string } };

const ROLES = ['user', 'Admin', 'Super Admin'] as const;
const PERMISSIONS = ['reader', 'editor'] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  if (role === 'Super Admin') return 'default';
  if (role === 'Admin') return 'secondary';
  return 'outline';
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function connectionMethod(m: Member): { label: string; icon: typeof KeyRound } {
  switch (m.authMethod) {
    case 'google':
      return { label: 'Google', icon: Users };
    case 'sso':
      return { label: 'Authentik (SSO)', icon: ShieldCheck };
    case 'password':
      return { label: 'Mot de passe', icon: KeyRound };
    default:
      return { label: 'Invitation', icon: Mail };
  }
}

export default function MemberManagement({ currentUserEmail }: { currentUserEmail: string }) {
  const {
    data,
    isLoading,
    error,
    mutate,
  } = useData<ApiEnvelope<{ members: Member[] }>>('/api/members');

  const members: Member[] = data?.success ? data.data.members : [];

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingBusy, setDeletingBusy] = useState(false);

  // Invite form
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<string>('user');
  const [permission, setPermission] = useState<string>('reader');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<string>('user');
  const [editPermission, setEditPermission] = useState<string>('reader');

  useEffect(() => {
    if (error) toast.error('Erreur lors du chargement des membres');
  }, [error]);

  function openInvite() {
    setEmail('');
    setDisplayName('');
    setRole('user');
    setPermission('reader');
    setInviteOpen(true);
  }

  function openEdit(m: Member) {
    setEditing(m);
    setEditName(m.displayName ?? '');
    setEditRole(m.role);
    setEditPermission(m.planningPermission);
  }

  async function handleInvite() {
    if (!EMAIL_RE.test(email.trim())) {
      toast.error('Adresse email invalide');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          displayName: displayName.trim() || undefined,
          role,
          planningPermission: permission,
        }),
      });
      const json: ApiEnvelope<{ warning?: string }> = await res.json();
      if (json.success) {
        toast.success(json.data?.warning ?? 'Invitation envoyée');
        setInviteOpen(false);
        mutate();
      } else {
        toast.error(json.error?.message ?? 'Erreur');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/members/${encodeURIComponent(editing.email)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editRole,
          planningPermission: editPermission,
          displayName: editName.trim(),
        }),
      });
      const json: ApiEnvelope<unknown> = await res.json();
      if (json.success) {
        toast.success('Membre mis à jour');
        setEditing(null);
        mutate();
      } else {
        toast.error(json.error?.message ?? 'Erreur');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      const res = await fetch(`/api/members/${encodeURIComponent(deleting.email)}`, {
        method: 'DELETE',
      });
      const json: ApiEnvelope<unknown> = await res.json();
      if (json.success) {
        toast.success('Membre supprimé');
        setDeleting(null);
        mutate();
      } else {
        toast.error(json.error?.message ?? 'Erreur');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Gestion des membres &amp; accès
          </h1>
          <p className="text-sm text-muted-foreground">
            Invitez des membres et gérez leur rôle (accès aux sections admin) ainsi que leur
            permission planning (lecture / édition).
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" onClick={openInvite}>
              <UserPlus className="h-4 w-4" />
              Inviter un membre
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inviter un membre</DialogTitle>
              <DialogDescription>
                Le membre recevra un email pour définir son mot de passe ou se connecter avec
                Google.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom.nom@zone01normandie.org"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-name">Nom (optionnel)</Label>
                <Input
                  id="invite-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Prénom Nom"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Rôle</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Accès planning</Label>
                  <Select value={permission} onValueChange={setPermission}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERMISSIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p === 'editor' ? 'Éditeur' : 'Lecteur'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleInvite} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Envoyer l&apos;invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <LoadingCard count={3} columns={3} height="md" />
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <EmptyState icon={Users} title="Aucun membre" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => {
            const method = connectionMethod(m);
            const MethodIcon = method.icon;
            const pending = m.isPending;
            const isSelf =
              !!currentUserEmail &&
              m.email.toLowerCase() === currentUserEmail.toLowerCase();
            return (
              <Card key={m.email}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">
                        {m.displayName || m.email}
                      </CardTitle>
                      {m.email && (
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(m)}
                        aria-label="Modifier"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {!isSelf && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleting(m)}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={roleBadgeVariant(m.role)} className="text-[10px]">
                      {m.role}
                    </Badge>
                    <Badge
                      variant={m.planningPermission === 'editor' ? 'default' : 'outline'}
                      className="text-[10px]"
                    >
                      {m.planningPermission === 'editor' ? 'Éditeur' : 'Lecteur'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <MethodIcon className="h-3 w-3" />
                      {method.label}
                    </Badge>
                    {pending && (
                      <Badge variant="secondary" className="text-[10px]">
                        Invitation en attente
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="flex items-center gap-1.5">
                      <MethodIcon className="h-3 w-3" />
                      {method.label}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Inscrit le {formatDate(m.signedUpAt)}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Actif le {formatDate(m.lastActiveAt)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog édition */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le membre</DialogTitle>
            <DialogDescription>
              {editing?.email ?? editing?.displayName ?? ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nom</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Prénom Nom"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Accès planning</Label>
                <Select value={editPermission} onValueChange={setEditPermission}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERMISSIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p === 'editor' ? 'Éditeur' : 'Lecteur'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button onClick={handleEditSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le compte de{' '}
              <strong>{deleting?.displayName || deleting?.email}</strong> sera définitivement
              supprimé (Stack Auth et/ou base locale).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deletingBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingBusy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
