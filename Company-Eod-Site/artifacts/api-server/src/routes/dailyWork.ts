import { Router } from "express";
import { db, dailyWorkTable, internalTasksTable, usersTable, teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { notifyEmployeeRecordDeleted } from "./notifications";

const router = Router();

// Daily Work is shown in the Task module as a regular task, using the task-style code.
const dailyWorkTaskCode = (dailyWorkId: number) => `TASK-${dailyWorkId}`;
const optionalDate = (value: unknown) => typeof value === "string" && value.trim() === "" ? null : value;

function toTaskValues(work: typeof dailyWorkTable.$inferSelect) {
  return {
    taskCode: dailyWorkTaskCode(work.id),
    taskName: work.action,
    how: work.how,
    who: work.who,
    assignedBy: work.assignedBy,
    priority: "medium",
    plannedStartDate: work.date,
    actualStartDate: work.startDate,
    actualEndDate: work.completionDate,
    status: work.status,
    completionPct: work.completionPct,
    remarks: work.remarks,
    userId: work.userId,
    teamId: work.teamId,
  };
}

async function syncTaskFromDailyWork(database: Pick<typeof db, "select" | "insert" | "update">, work: typeof dailyWorkTable.$inferSelect) {
  const taskCode = dailyWorkTaskCode(work.id);
  const [existingTask] = await database
    .select({ id: internalTasksTable.id })
    .from(internalTasksTable)
    .where(eq(internalTasksTable.taskCode, taskCode));

  if (existingTask) {
    await database.update(internalTasksTable).set(toTaskValues(work)).where(eq(internalTasksTable.id, existingTask.id));
  } else {
    await database.insert(internalTasksTable).values(toTaskValues(work));
  }
}

async function enrichWork(item: typeof dailyWorkTable.$inferSelect) {
  let userName: string | null = null;
  let teamName: string | null = null;

  if (item.userId) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, item.userId));
    userName = user?.name ?? null;
  }
  if (item.teamId) {
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, item.teamId));
    teamName = team?.name ?? null;
  }

  return {
    id: item.id,
    action: item.action,
    how: item.how,
    who: item.who,
    assignedBy: item.assignedBy,
    date: item.date,
    startDate: item.startDate,
    completionDate: item.completionDate,
    status: item.status,
    completionPct: item.completionPct,
    remarks: item.remarks,
    userId: item.userId,
    teamId: item.teamId,
    userName,
    teamName,
    createdAt: item.createdAt?.toISOString(),
  };
}

router.get("/daily-work", async (req, res) => {
  const { userId, teamId, tlId, date, month, year, status, week } = req.query;
  let items = await db.select().from(dailyWorkTable);

  if (userId) items = items.filter(i => i.userId === parseInt(userId as string));
  
  // Filter by specific team
  if (teamId) {
    items = items.filter(i => i.teamId === parseInt(teamId as string));
  }
  // OR filter by TL - get all teams managed by this TL
  else if (tlId) {
    const tlTeams = await db.select().from(teamsTable).where(eq(teamsTable.tlId, parseInt(tlId as string)));
    const teamIds = tlTeams.map(t => t.id);
    items = items.filter(i => i.teamId && teamIds.includes(i.teamId));
  }
  
  if (date) items = items.filter(i => i.date === date);
  if (status) items = items.filter(i => i.status === status);
  if (month) {
    items = items.filter(i => {
      const d = new Date(i.date + "T00:00:00Z");
      return d.getUTCMonth() + 1 === parseInt(month as string);
    });
  }
  if (year) {
    items = items.filter(i => {
      const d = new Date(i.date + "T00:00:00Z");
      return d.getUTCFullYear() === parseInt(year as string);
    });
  }
  if (week) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    items = items.filter(i => {
      const d = new Date(i.date + "T00:00:00Z");
      return d >= startOfWeek && d <= endOfWeek;
    });
  }

  const enriched = await Promise.all(items.map(enrichWork));
  res.json(enriched);
});

router.post("/daily-work", async (req, res) => {
  const { action, date, status, ...rest } = req.body;
  if (!action || !date) return res.status(400).json({ error: "action and date required" });

  const item = await db.transaction(async (tx) => {
    const [dailyWork] = await tx.insert(dailyWorkTable).values({
      action,
      date,
      status: status ?? "yts",
      how: rest.how ?? null,
      who: rest.who ?? null,
      assignedBy: rest.assignedBy ?? null,
      startDate: optionalDate(rest.startDate) ?? null,
      completionDate: optionalDate(rest.completionDate) ?? null,
      completionPct: rest.completionPct ?? 0,
      remarks: rest.remarks ?? null,
      userId: rest.userId ?? null,
      teamId: rest.teamId ?? null,
    }).returning();
    await syncTaskFromDailyWork(tx, dailyWork);
    return dailyWork;
  });

  res.status(201).json(await enrichWork(item));
});

router.get("/daily-work/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [item] = await db.select().from(dailyWorkTable).where(eq(dailyWorkTable.id, id));
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(await enrichWork(item));
});

router.patch("/daily-work/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const updates: Partial<typeof dailyWorkTable.$inferInsert> = {};
  const fields = ["action", "how", "who", "assignedBy", "date", "startDate", "completionDate", "status", "completionPct", "remarks"];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      (updates as any)[f] = f === "startDate" || f === "completionDate" ? optionalDate(req.body[f]) : req.body[f];
    }
  }
  const item = await db.transaction(async (tx) => {
    const [dailyWork] = await tx.update(dailyWorkTable).set(updates).where(eq(dailyWorkTable.id, id)).returning();
    if (dailyWork) await syncTaskFromDailyWork(tx, dailyWork);
    return dailyWork;
  });
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(await enrichWork(item));
});

router.delete("/daily-work/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [item] = await db.select().from(dailyWorkTable).where(eq(dailyWorkTable.id, id));
  if (!item) return res.status(404).json({ error: "Not found" });
  await db.transaction(async (tx) => {
    await tx.delete(internalTasksTable).where(eq(internalTasksTable.taskCode, dailyWorkTaskCode(id)));
    await tx.delete(dailyWorkTable).where(eq(dailyWorkTable.id, id));
  });
  await notifyEmployeeRecordDeleted(item.userId, item.teamId, "Daily Work", item.action, item.id);
  res.status(204).send();
});

export default router;
