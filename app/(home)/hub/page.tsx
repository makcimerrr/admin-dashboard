import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, FileText, Plus, ArrowRight } from "lucide-react";
import { getUpcomingHubEvents, getUpcomingHubTasks } from "@/lib/db/services/hub";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function HubPage() {
  let upcomingEvents: Awaited<ReturnType<typeof getUpcomingHubEvents>> = [];
  let upcomingTasks: Awaited<ReturnType<typeof getUpcomingHubTasks>> = [];

  try {
    upcomingEvents = await getUpcomingHubEvents(5);
    upcomingTasks = await getUpcomingHubTasks(5);
  } catch (err) {
    console.error("Error loading hub data:", err);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Hub Zone01</h1>
          <p className="text-muted-foreground">Gestion des événements et tâches</p>
        </div>
        <div className="flex gap-2">
          <Link href="/hub/events/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvel événement
            </Button>
          </Link>
          <Link href="/hub/templates/new">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau modèle
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Événements à venir
              </CardTitle>
              <CardDescription>Prochains événements planifiés</CardDescription>
            </div>
            <Link href="/hub/events">
              <Button variant="ghost" size="sm">
                Voir tout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun événement à venir</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <Link key={event.id} href={`/hub/events/${event.id}`}>
                    <div className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <p className="font-medium">{event.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.startDate), "d MMMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Tâches à venir
              </CardTitle>
              <CardDescription>Prochaines tâches à réaliser</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune tâche à venir</p>
            ) : (
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="p-3 rounded-lg border">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.eventName} • {format(task.date, "d MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/hub/events">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Événements
              </CardTitle>
              <CardDescription>
                Gérez vos événements instanciés à partir de modèles
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/hub/templates">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Modèles
              </CardTitle>
              <CardDescription>
                Créez et gérez vos modèles d'événements avec tâches
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}