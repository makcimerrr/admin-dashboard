"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Eye, PenIcon, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface Event {
  id: string;
  name: string;
  startDate: string;
  template: {
    id: string;
    name: string;
  };
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hub/events");
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      toast.error("Erreur lors du chargement des événements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet événement ?")) return;

    const res = await fetch(`/api/hub/events/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Événement supprimé");
      load();
    } else {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl md:text-3xl font-bold mb-1">Événements</h1>
          <p className="text-muted-foreground">Liste des événements instanciés</p>
        </div>

        <Button size="lg" onClick={() => router.push("/word_assistant/events/new")}>
          <Plus className="mr-2" />
          Nouvel événement
        </Button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-2/3 mb-4" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucun événement pour le moment</h3>
            <p className="text-muted-foreground mb-4">
              Créez votre premier événement pour commencer
            </p>
            <Button onClick={() => router.push("/word_assistant/events/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un événement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <Card key={event.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {event.name}
                  <Calendar className="h-5 w-5 text-primary" />
                </CardTitle>
                <CardDescription>
                  Basé sur : {event.template?.name || "Modèle inconnu"}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="text-sm mb-4">
                  Début :{" "}
                  <strong>
                    {format(new Date(event.startDate), "PPP", { locale: fr })}
                  </strong>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => router.push(`/word_assistant/events/${event.id}`)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Voir timeline
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => router.push(`/word_assistant/events/${event.id}/edit`)}
                  >
                    <PenIcon className="h-4 w-4" />
                  </Button>

                  <Button variant="outline" onClick={() => handleDelete(event.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
