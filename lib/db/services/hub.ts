import { db } from '@/lib/db/config';
import { eq, desc, asc, gte, and, ne, inArray } from 'drizzle-orm';
import {
  hubTemplates,
  hubTasks,
  hubEvents,
  hubEventTasks,
  hubAssignments,
  type NewHubTemplate,
  type NewHubTask,
  type NewHubEvent,
} from '../schema/hub';

// ============== TEMPLATES ==============

export async function getHubTemplates() {
  return db.query.hubTemplates.findMany({
    orderBy: [asc(hubTemplates.name)],
    with: {
      tasks: {
        orderBy: [asc(hubTasks.displayOrder)],
      },
    },
  });
}

export async function getHubTemplateById(id: string) {
  return db.query.hubTemplates.findFirst({
    where: eq(hubTemplates.id, id),
    with: {
      tasks: {
        orderBy: [asc(hubTasks.displayOrder)],
        with: {
          assignments: true,
        },
      },
    },
  });
}

export async function createHubTemplate(data: {
  name: string;
  description?: string;
  tasks?: Array<{
    title: string;
    description?: string;
    offsetDays: number;
    assignedUsers?: string[];
  }>;
}) {
  return db.transaction(async (tx) => {
    const [template] = await tx.insert(hubTemplates).values({
      name: data.name,
      description: data.description,
    }).returning();

    if (data.tasks && data.tasks.length > 0) {
      for (let i = 0; i < data.tasks.length; i++) {
        const task = data.tasks[i];
        const [createdTask] = await tx.insert(hubTasks).values({
          templateId: template.id,
          title: task.title,
          description: task.description,
          offsetDays: task.offsetDays,
          displayOrder: i,
        }).returning();

        if (task.assignedUsers && task.assignedUsers.length > 0) {
          await tx.insert(hubAssignments).values(
            task.assignedUsers.map((userId) => ({
              taskId: createdTask.id,
              userId,
            }))
          );
        }
      }
    }

    return template;
  });
}

export async function updateHubTemplate(
  id: string,
  data: {
    name: string;
    description?: string;
    tasks?: Array<{
      title: string;
      description?: string;
      offsetDays: number;
      assignedUsers?: string[];
    }>;
  }
) {
  return db.transaction(async (tx) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get future events using this template
    const futureEvents = await tx.query.hubEvents.findMany({
      where: and(
        eq(hubEvents.templateId, id),
        gte(hubEvents.startDate, today.toISOString().split('T')[0])
      ),
    });

    const futureEventIds = futureEvents.map((e) => e.id);

    // Delete non-completed event tasks for future events
    if (futureEventIds.length > 0) {
      await tx.delete(hubEventTasks).where(
        and(
          inArray(hubEventTasks.eventId, futureEventIds),
          ne(hubEventTasks.status, 'COMPLETED')
        )
      );
    }

    // Delete old tasks (cascade deletes assignments)
    await tx.delete(hubTasks).where(eq(hubTasks.templateId, id));

    // Update template
    const [updatedTemplate] = await tx.update(hubTemplates)
      .set({
        name: data.name,
        description: data.description,
        updatedAt: new Date(),
      })
      .where(eq(hubTemplates.id, id))
      .returning();

    // Recreate tasks
    const createdTasks: Array<{ id: string; offsetDays: number }> = [];
    if (data.tasks && data.tasks.length > 0) {
      for (let i = 0; i < data.tasks.length; i++) {
        const task = data.tasks[i];
        const [createdTask] = await tx.insert(hubTasks).values({
          templateId: id,
          title: task.title,
          description: task.description,
          offsetDays: task.offsetDays,
          displayOrder: i,
        }).returning();

        createdTasks.push({ id: createdTask.id, offsetDays: task.offsetDays });

        if (task.assignedUsers && task.assignedUsers.length > 0) {
          await tx.insert(hubAssignments).values(
            task.assignedUsers.map((userId) => ({
              taskId: createdTask.id,
              userId,
            }))
          );
        }
      }
    }

    // Recreate event tasks for future events
    for (const event of futureEvents) {
      for (const task of createdTasks) {
        const eventDate = new Date(event.startDate);
        const taskDate = new Date(eventDate);
        taskDate.setDate(taskDate.getDate() + task.offsetDays);

        if (taskDate >= today) {
          await tx.insert(hubEventTasks).values({
            eventId: event.id,
            taskId: task.id,
            status: 'NOT_STARTED',
          });
        }
      }
    }

    return updatedTemplate;
  });
}

export async function deleteHubTemplate(id: string) {
  return db.delete(hubTemplates).where(eq(hubTemplates.id, id));
}

// ============== EVENTS ==============

export async function getHubEvents() {
  return db.query.hubEvents.findMany({
    orderBy: [desc(hubEvents.startDate)],
    with: {
      template: true,
    },
  });
}

export async function getHubEventById(id: string) {
  return db.query.hubEvents.findFirst({
    where: eq(hubEvents.id, id),
    with: {
      template: true,
      eventTasks: {
        with: {
          task: {
            with: {
              assignments: true,
            },
          },
        },
      },
    },
  });
}

export async function createHubEvent(data: {
  templateId: string;
  name: string;
  startDate: string;
}) {
  return db.transaction(async (tx) => {
    // Get template with tasks
    const template = await tx.query.hubTemplates.findFirst({
      where: eq(hubTemplates.id, data.templateId),
      with: {
        tasks: true,
      },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Create event
    const [event] = await tx.insert(hubEvents).values({
      templateId: data.templateId,
      name: data.name,
      startDate: data.startDate,
    }).returning();

    // Create event tasks
    if (template.tasks.length > 0) {
      await tx.insert(hubEventTasks).values(
        template.tasks.map((task) => ({
          eventId: event.id,
          taskId: task.id,
          status: 'NOT_STARTED' as const,
        }))
      );
    }

    return event;
  });
}

export async function updateHubEvent(
  id: string,
  data: {
    name: string;
    startDate: string;
    templateId: string;
  }
) {
  return db.transaction(async (tx) => {
    // Get existing event
    const existingEvent = await tx.query.hubEvents.findFirst({
      where: eq(hubEvents.id, id),
    });

    if (!existingEvent) {
      throw new Error('Event not found');
    }

    // Update event
    const [updatedEvent] = await tx.update(hubEvents)
      .set({
        name: data.name,
        startDate: data.startDate,
        templateId: data.templateId,
        updatedAt: new Date(),
      })
      .where(eq(hubEvents.id, id))
      .returning();

    // If template changed, recreate event tasks
    if (data.templateId !== existingEvent.templateId) {
      // Delete non-completed event tasks
      await tx.delete(hubEventTasks).where(
        and(
          eq(hubEventTasks.eventId, id),
          ne(hubEventTasks.status, 'COMPLETED')
        )
      );

      // Get new template with tasks
      const template = await tx.query.hubTemplates.findFirst({
        where: eq(hubTemplates.id, data.templateId),
        with: {
          tasks: true,
        },
      });

      if (template && template.tasks.length > 0) {
        await tx.insert(hubEventTasks).values(
          template.tasks.map((task) => ({
            eventId: id,
            taskId: task.id,
            status: 'NOT_STARTED' as const,
          }))
        );
      }
    }

    return updatedEvent;
  });
}

export async function deleteHubEvent(id: string) {
  return db.delete(hubEvents).where(eq(hubEvents.id, id));
}

// ============== EVENT TASKS ==============

export async function updateHubEventTaskStatus(
  eventId: string,
  taskId: string,
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
) {
  return db.update(hubEventTasks)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(hubEventTasks.eventId, eventId),
        eq(hubEventTasks.taskId, taskId)
      )
    )
    .returning();
}

// ============== UPCOMING ==============

export async function getUpcomingHubEvents(limit = 5) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return db.query.hubEvents.findMany({
    where: gte(hubEvents.startDate, today.toISOString().split('T')[0]),
    orderBy: [asc(hubEvents.startDate)],
    limit,
  });
}

export async function getUpcomingHubTasks(limit = 5) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = await db.query.hubEvents.findMany({
    where: gte(hubEvents.startDate, today.toISOString().split('T')[0]),
    orderBy: [asc(hubEvents.startDate)],
    with: {
      eventTasks: {
        where: ne(hubEventTasks.status, 'COMPLETED'),
        with: {
          task: {
            with: {
              assignments: true,
            },
          },
        },
      },
    },
  });

  const tasks = events.flatMap((event) =>
    event.eventTasks.map((eventTask) => {
      const eventDate = new Date(event.startDate);
      const taskDate = new Date(eventDate);
      taskDate.setDate(taskDate.getDate() + eventTask.task.offsetDays);

      return {
        id: `${event.id}-${eventTask.taskId}`,
        eventId: event.id,
        taskId: eventTask.taskId,
        title: eventTask.task.title,
        description: eventTask.task.description,
        date: taskDate,
        eventName: event.name,
        status: eventTask.status,
        assignedUsers: eventTask.task.assignments,
      };
    })
  );

  return tasks
    .filter((task) => task.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, limit);
}
