"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/hooks/use-toast";
import { Users, Plus, Trash2, Edit, Loader2, Mail, Phone } from "lucide-react";
import type { Employee } from "@/lib/db/schema/employees";
import { useUser } from "@stackframe/stack";
import { PlanningPageHeader } from '@/components/planning/planning-page-header';

const colors = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#6366F1", "#EC4899", "#14B8A6", "#F97316", "#84CC16",
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmployee, setNewEmployee] = useState({
    name: "", initial: "", role: "", email: "", phone: "",
  });
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { toast } = useToast();
  const stackUser = useUser();
  const planningPermission = stackUser
    ? ((stackUser.clientReadOnlyMetadata?.planningPermission ||
       stackUser.clientMetadata?.planningPermission ||
       'reader') as string)
    : 'reader';

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de charger les employés", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name.trim() || !newEmployee.role.trim()) {
      toast({ title: "Erreur", description: "Le nom et le poste sont obligatoires", variant: "destructive" });
      return;
    }
    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newEmployee,
          color: colors[employees.length % colors.length],
          email: newEmployee.email || `${newEmployee.name.toLowerCase().replace(" ", ".")}@entreprise.com`,
        }),
      });
      if (response.ok) {
        const employee = await response.json();
        setEmployees([...employees, employee]);
        setNewEmployee({ name: "", initial: "", role: "", email: "", phone: "" });
        setShowAddDialog(false);
        toast({ title: "Succès", description: "Employé ajouté avec succès" });
      } else {
        throw new Error("Failed to create employee");
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'ajouter l'employé", variant: "destructive" });
    }
  };

  const handleEditEmployee = async () => {
    if (!editingEmployee) return;
    try {
      const response = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingEmployee.name === '' ? '' : editingEmployee.name,
          initial: editingEmployee.initial === '' ? '' : editingEmployee.initial,
          role: editingEmployee.role === '' ? '' : editingEmployee.role,
          avatar: editingEmployee.avatar === '' ? null : editingEmployee.avatar,
          color: editingEmployee.color === '' ? '' : editingEmployee.color,
          email: editingEmployee.email === '' ? '' : editingEmployee.email,
          phone: editingEmployee.phone === '' ? null : editingEmployee.phone,
          isActive: editingEmployee.isActive,
          hoursPerWeek: editingEmployee.hoursPerWeek === '' ? null : editingEmployee.hoursPerWeek,
        }),
      });
      if (response.ok) {
        const updatedEmployee = await response.json();
        setEmployees(employees.map((emp) => (emp.id === updatedEmployee.id ? updatedEmployee : emp)));
        setEditingEmployee(null);
        setShowEditDialog(false);
        toast({ title: "Succès", description: "Employé modifié avec succès" });
      } else {
        throw new Error("Failed to update employee");
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de modifier l'employé", variant: "destructive" });
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet employé ?")) return;
    try {
      const response = await fetch(`/api/employees/${employeeId}`, { method: "DELETE" });
      if (response.ok) {
        setEmployees(employees.filter((emp) => emp.id !== employeeId));
        toast({ title: "Succès", description: "Employé supprimé avec succès" });
      } else {
        throw new Error("Failed to delete employee");
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer l'employé", variant: "destructive" });
    }
  };

  const activeCount = employees.filter(e => e.isActive !== false).length;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] p-3 gap-2 overflow-hidden">
      <PlanningPageHeader
        title="Employés"
        subtitle="Ajoutez et gérez les membres de votre équipe"
        icon={Users}
        permission={planningPermission}
      >
        <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
          {activeCount} actif{activeCount > 1 ? 's' : ''}
        </Badge>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={planningPermission !== 'editor'}
              title={planningPermission !== 'editor' ? 'Accès en lecture seule' : undefined}
            >
              <Plus className="h-3 w-3" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un nouvel employé</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nom complet *</Label>
                <Input id="name" value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} placeholder="Ex: Jean Dupont" />
              </div>
              <div>
                <Label htmlFor="initials">Initiales *</Label>
                <Input id="initials" value={newEmployee.initial} onChange={(e) => setNewEmployee({ ...newEmployee, initial: e.target.value })} placeholder="Ex: JED" />
              </div>
              <div>
                <Label htmlFor="role">Poste *</Label>
                <Input id="role" value={newEmployee.role} onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })} placeholder="Ex: Développeur" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} placeholder="Ex: jean.dupont@entreprise.com" />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" value={newEmployee.phone} onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })} placeholder="Ex: 06 12 34 56 78" />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleAddEmployee} className="flex-1">Ajouter</Button>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Annuler</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PlanningPageHeader>

      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucun employé pour le moment</p>
            <Button size="sm" onClick={() => setShowAddDialog(true)} disabled={planningPermission !== 'editor'}>
              <Plus className="h-3 w-3 mr-1" />
              Ajouter le premier employé
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-1">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="rounded-xl border bg-background p-3 border-l-4 transition-shadow hover:shadow-md"
                style={{ borderLeftColor: employee.color || '#8884d8' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-9 w-9 ring-2 ring-offset-1" style={{ ['--tw-ring-color' as string]: employee.color || '#8884d8' }}>
                      <AvatarImage src={`https://avatar.vercel.sh/${employee.id}.png`} />
                      <AvatarFallback className="text-xs font-bold">{employee.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">{employee.name}</h3>
                      <p className="text-[11px] text-muted-foreground">{employee.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 p-0"
                      onClick={() => { setEditingEmployee(employee); setShowEditDialog(true); }}
                      disabled={planningPermission !== 'editor'}
                      title={planningPermission !== 'editor' ? 'Accès en lecture seule' : undefined}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteEmployee(employee.id)}
                      disabled={planningPermission !== 'editor'}
                      title={planningPermission !== 'editor' ? 'Accès en lecture seule' : undefined}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  {employee.email && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                  )}
                  {employee.phone && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  {employee.hoursPerWeek && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 mt-1" style={{ borderColor: employee.color || '#8884d8', color: employee.color || '#8884d8' }}>
                      {employee.hoursPerWeek}h/sem
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'employé</DialogTitle>
          </DialogHeader>
          {editingEmployee && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nom complet *</Label>
                <Input id="edit-name" value={editingEmployee.name} onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="edit-initial">Initiales *</Label>
                <Input id="edit-initial" value={editingEmployee.initial} onChange={(e) => setEditingEmployee({ ...editingEmployee, initial: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="edit-role">Poste *</Label>
                <Input id="edit-role" value={editingEmployee.role} onChange={(e) => setEditingEmployee({ ...editingEmployee, role: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" value={editingEmployee.email} onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="edit-phone">Téléphone</Label>
                <Input id="edit-phone" value={editingEmployee.phone ?? ""} onChange={(e) => setEditingEmployee({ ...editingEmployee, phone: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleEditEmployee} className="flex-1">Sauvegarder</Button>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>Annuler</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
