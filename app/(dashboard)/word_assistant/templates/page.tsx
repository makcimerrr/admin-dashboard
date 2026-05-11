"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Calendar, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingCard } from "@/components/ui/loading-card";

interface Template {
  id: string;
  name: string;
  description?: string | null;
  tasks: Array<{ id: string }>;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hub/templates");
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      toast.error("Erreur lors du chargement des modèles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce modèle ?")) return;

    try {
      const res = await fetch(`/api/hub/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Modèle supprimé");
        load();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la suppression");
      }
    } catch (err) {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-foreground mb-2">
            Modèles d'Événements
          </h1>
          <p className="text-muted-foreground">
            Créez et gérez vos modèles d'événements
          </p>
        </div>

        <Link href="/word_assistant/templates/new">
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Nouveau Modèle
          </Button>
        </Link>
      </div>

      {loading ? (
        <LoadingCard count={3} columns={3} height="md" />
      ) : templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{template.name}</span>
                  <Calendar className="h-5 w-5 text-primary" />
                </CardTitle>

                <CardDescription className="line-clamp-2">
                  {template.description || "Aucune description"}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {template.tasks?.length || 0} tâches
                  </span>

                  <div className="flex gap-2">
                    <Link href={`/word_assistant/templates/${template.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-6">
            <EmptyState
              icon={Calendar}
              title="Aucun modèle pour le moment"
              description="Créez votre premier modèle d'événement pour commencer"
              action={
                <Link href="/word_assistant/templates/new">
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un modèle
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
