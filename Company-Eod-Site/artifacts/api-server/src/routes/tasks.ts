import { Router } from "express";
import { db, internalTasksTable, usersTable, teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function enrichTask(task: typeof internalTasksTable.$inferSelect) {
  let userName: string | null = null;
  let teamName: string | null = null;

  if (task.userId) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, task.userId));
    userName = user?.name ?? null;
  }
  if (task.teamId) {
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, task.teamId));
    teamName = team?.name ?? null;
  }

  return {
    id: task.id,
    taskCode: task.taskCode,
    taskName: task.taskName,
    how: task.how,
    who: task.who,
    assignedBy: task.assignedBy,
    priority: task.priority,
    plannedStartDate: task.plannedStartDate,
    plannedEndDate: task.plannedEndDate,
    actualStartDate: task.actualStartDate,
    actualEndDate: task.actualEndDate,
    status: task.status,
    completionPct: task.completionPct,
    dependency: task.dependency,
    remarks: task.remarks,
    etc: task.etc,
    userId: task.userId,
    teamId: task.teamId,
    userName,
    teamName,
    createdAt: task.createdAt?.toISOString(),
  };
}

router.get("/tasks/status-summary", async (req, res) => {
  const { teamId, month, year } = req.query;
  let tasks = await db.select().from(internalTasksTable);

  if (teamId) tasks = tasks.filter(t => t.teamId === parseInt(teamId as string));
  if (month) {
    tasks = tasks.filter(t => {
      if (!t.plannedStartDate) return true;
      const d = new Date(t.plannedStartDate + "T00:00:00Z");
      return d.getUTCMonth() + 1 === parseInt(month as string);
    });
  }
  if (year) {
    tasks = tasks.filter(t => {
      if (!t.plannedStartDate) return true;
      const d = new Date(t.plannedStartDate + "T00:00:00Z");
      return d.getUTCFullYear() === parseInt(year as string);
    });
  }

  const summary = {
    completed: tasks.filter(t => t.status === "completed").length,
    wip: tasks.filter(t => t.status === "wip").length,
    yts: tasks.filter(t => t.status === "yts").length,
    hold: tasks.filter(t => t.status === "hold").length,
    cancelled: tasks.filter(t => t.status === "cancelled").length,
    total: tasks.length,
  };

  res.json(summary);
});

router.get("/tasks", async (req, res) => {
  const { status, userId, teamId, tlId, month, year, priority, assignedBy } = req.query;
  let tasks = await db.select().from(internalTasksTable);

  if (status) tasks = tasks.filter(t => t.status === status);
  if (userId) tasks = tasks.filter(t => t.userId === parseInt(userId as string));
  
  // Filter by specific team
  if (teamId) {
    tasks = tasks.filter(t => t.teamId === parseInt(teamId as string));
  }
  // OR filter by TL - get all teams managed by this TL
  else if (tlId) {
    const tlTeams = await db.select().from(teamsTable).where(eq(teamsTable.tlId, parseInt(tlId as string)));
    const teamIds = tlTeams.map(t => t.id);
    tasks = tasks.filter(t => t.teamId && teamIds.includes(t.teamId));
  }
  if (priority) tasks = tasks.filter(t => t.priority === priority);
  if (assignedBy) tasks = tasks.filter(t => t.assignedBy === assignedBy);
  if (month) {
    tasks = tasks.filter(t => {
      if (!t.plannedStartDate) return true;
      const d = new Date(t.plannedStartDate + "T00:00:00Z");
      return d.getUTCMonth() + 1 === parseInt(month as string);
    });
  }
  if (year) {
    tasks = tasks.filter(t => {
      if (!t.plannedStartDate) return true;
      const d = new Date(t.plannedStartDate + "T00:00:00Z");
      return d.getUTCFullYear() === parseInt(year as string);
    });
  }

  const enriched = await Promise.all(tasks.map(enrichTask));
  res.json(enriched);
});

router.post("/tasks", async (req, res) => {
  const { taskName, status, ...rest } = req.body;
  if (!taskName) return res.status(400).json({ error: "taskName required" });

  const [task] = await db.insert(internalTasksTable).values({
    taskName,
    status: status ?? "yts",
    taskCode: rest.taskCode ?? null,
    how: rest.how ?? null,
    who: rest.who ?? null,
    assignedBy: rest.assignedBy ?? null,
    priority: rest.priority ?? "medium",
    plannedStartDate: rest.plannedStartDate ?? null,
    plannedEndDate: rest.plannedEndDate ?? null,
    actualStartDate: rest.actualStartDate ?? null,
    actualEndDate: rest.actualEndDate ?? null,
    completionPct: rest.completionPct ?? 0,
    dependency: rest.dependency ?? null,
    remarks: rest.remarks ?? null,
    etc: rest.etc ?? null,
    userId: rest.userId ?? null,
    teamId: rest.teamId ?? null,
  }).returning();

  res.status(201).json(await enrichTask(task));
});

router.get("/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [task] = await db.select().from(internalTasksTable).where(eq(internalTasksTable.id, id));
  if (!task) return res.status(404).json({ error: "Not found" });
  res.json(await enrichTask(task));
});

router.patch("/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const updates: Partial<typeof internalTasksTable.$inferInsert> = {};
  const fields = ["taskCode", "taskName", "how", "who", "assignedBy", "priority", "plannedStartDate", "plannedEndDate", "actualStartDate", "actualEndDate", "status", "completionPct", "dependency", "remarks", "etc", "userId", "teamId"];
  for (const f of fields) {
    if (req.body[f] !== undefined) (updates as any)[f] = req.body[f];
  }
  const [task] = await db.update(internalTasksTable).set(updates).where(eq(internalTasksTable.id, id)).returning();
  if (!task) return res.status(404).json({ error: "Not found" });
  res.json(await enrichTask(task));
});

router.delete("/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(internalTasksTable).where(eq(internalTasksTable.id, id));
  res.status(204).send();
});

export default router;
