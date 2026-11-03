import { prisma } from './db.js';
import { remember } from './memory.js';

export const toolDeclarations = [
  { name: 'get_current_time', description: 'Returns current date and time in ISO.', parameters: { type: 'OBJECT', properties: {} } },
  {
    name: 'save_memory',
    description: 'Save a durable fact about the user.',
    parameters: {
      type: 'OBJECT',
      properties: {
        key: { type: 'STRING' }, value: { type: 'STRING' },
        kind: { type: 'STRING', enum: ['fact', 'preference', 'project', 'event'] },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'create_reminder',
    description: 'Create a reminder at a specific time.',
    parameters: { type: 'OBJECT', properties: { text: { type: 'STRING' }, dueAt: { type: 'STRING' } }, required: ['text', 'dueAt'] },
  },
  { name: 'list_reminders', description: 'List upcoming reminders.', parameters: { type: 'OBJECT', properties: {} } },
];

export async function handleToolCall(userId: string, name: string, args: any): Promise<string> {
  try {
    switch (name) {
      case 'get_current_time': return JSON.stringify({ now: new Date().toISOString() });
      case 'save_memory': {
        await remember(userId, args.kind ?? 'fact', args.key, args.value);
        return JSON.stringify({ ok: true, saved: args.key });
      }
      case 'create_reminder': {
        const dueAt = new Date(args.dueAt);
        if (isNaN(dueAt.getTime())) return JSON.stringify({ error: 'invalid dueAt' });
        const r = await prisma.reminder.create({ data: { userId, text: args.text, dueAt } });
        return JSON.stringify({ ok: true, id: r.id, dueAt: r.dueAt.toISOString() });
      }
      case 'list_reminders': {
        const rows = await prisma.reminder.findMany({
          where: { userId, done: false, dueAt: { gte: new Date(Date.now() - 86400000) } },
          orderBy: { dueAt: 'asc' }, take: 10,
        });
        return JSON.stringify(rows.map((r) => ({ text: r.text, dueAt: r.dueAt.toISOString() })));
      }
      default: return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (e) { return JSON.stringify({ error: (e as Error).message }); }
}
