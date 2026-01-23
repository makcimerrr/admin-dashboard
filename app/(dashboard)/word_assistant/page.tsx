import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Calendar, FileText, Plus, ArrowRight } from 'lucide-react';
import {
  getUpcomingHubEvents,
  getUpcomingHubTasks
} from '@/lib/db/services/hub';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  isSameMonth
} from 'date-fns';
import { fr } from 'date-fns/locale';

export default async function HubDashboardPage() {
  let upcomingEvents: Awaited<ReturnType<typeof getUpcomingHubEvents>> = [];
  let upcomingTasks: Awaited<ReturnType<typeof getUpcomingHubTasks>> = [];

  try {
    upcomingEvents = await getUpcomingHubEvents(50);
    upcomingTasks = await getUpcomingHubTasks(5);
  } catch (err) {
    console.error('Error loading hub data:', err);
  }

  const today = new Date();

  function CalendarPreview({
    year,
    month
  }: {
    year: number;
    month: number; // 0-indexed
  }) {
    const monthStart = startOfMonth(new Date(year, month));
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let curr = calendarStart;
    while (curr <= calendarEnd) {
      days.push(curr);
      curr = addDays(curr, 1);
    }

    const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-medium">
              {format(monthStart, 'LLLL yyyy', { locale: fr })}
            </h3>
            <p className="text-xs text-muted-foreground">
              Aperçu du calendrier
            </p>
          </div>
          <Link href="/word_assistant/calendar">
            <Button variant="ghost" size="sm">
              Ouvrir le calendrier
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs">
          {weekDays.map((wd) => (
            <div
              key={wd}
              className="text-center font-medium text-muted-foreground"
            >
              {wd}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 mt-1">
          {days.map((day) => {
            const inMonth = isSameMonth(day, monthStart);
            const eventsOnDay = upcomingEvents.filter((ev) =>
              isSameDay(new Date(ev.startDate), day)
            );
            return (
              <div
                key={day.toISOString()}
                className={`p-2 min-h-[56px] rounded border ${
                  inMonth ? 'bg-card' : 'bg-muted/30 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-medium ${
                      isSameDay(day, today) ? 'text-primary' : ''
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  {eventsOnDay.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      className="text-2xs truncate rounded px-1 py-0.5 bg-primary/10 text-primary"
                    >
                      {ev.name}
                    </div>
                  ))}
                  {eventsOnDay.length > 2 && (
                    <div className="text-2xs text-muted-foreground">
                      +{eventsOnDay.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Assistant - Gestion des événements</h1>
          <p className="text-muted-foreground">
            Planifiez et suivez vos événements
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/word_assistant/events/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvel événement
            </Button>
          </Link>
          <Link href="/word_assistant/templates/new">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau modèle
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Événements à venir
              </CardTitle>
              <CardDescription>Prochains événements planifiés</CardDescription>
            </div>
            <Link href="/word_assistant/events">
              <Button variant="ghost" size="sm">
                Voir tout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun événement à venir
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.slice(0, 5).map((event) => (
                  <Link
                    key={event.id}
                    href={`/word_assistant/events/${event.id}`}
                  >
                    <div className="p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                      <p className="font-medium text-sm">{event.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.startDate), 'd MMMM yyyy', {
                          locale: fr
                        })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Tâches à venir
            </CardTitle>
            <CardDescription>Prochaines tâches à réaliser</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune tâche à venir
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="p-2 rounded-lg border">
                    <p className="font-medium text-sm">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.eventName} •{' '}
                      {format(new Date(task.date), 'd MMM yyyy', {
                        locale: fr
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Événements
            </CardTitle>
            <CardDescription>
              Gérez vos événements instanciés à partir de modèles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/word_assistant/events">
              <Button variant="link" className="mt-2">
                Aller aux événements
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Modèles
            </CardTitle>
            <CardDescription>
              Créez et gérez vos modèles d'événements avec tâches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/word_assistant/templates">
              <Button variant="link" className="mt-2">
                Aller aux modèles
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Aperçu du calendrier
            </CardTitle>
            <CardDescription>
              Vue rapide du mois courant avec les événements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CalendarPreview
              year={today.getFullYear()}
              month={today.getMonth()}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/word_assistant/events">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
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

        <Link href="/word_assistant/templates">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
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
