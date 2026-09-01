import { Router } from "express";
import { db, trainingRecordsTable, usersTable, teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { notifyEmployeeRecordDeleted } from "./notifications";

const router = Router();

async function enrichTraining(record: typeof trainingRecordsTable.$inferSelect) {
  let userName: string | null = null;
  let teamName: string | null = null;

  if (record.userId) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, record.userId));
    userName = user?.name ?? null;
  }
  if (record.teamId) {
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, record.teamId));
    teamName = team?.name ?? null;
  }

  return {
    id: record.id,
    topic: record.topic,
    category: record.category,
    trainer: record.trainer,
    startDate: record.startDate,
    endDate: record.endDate,
    status: record.status,
    progressPct: record.progressPct,
    remarks: record.remarks,
    userId: record.userId,
    teamId: record.teamId,
    userName,
    teamName,
    createdAt: record.createdAt?.toISOString(),
  };
}

router.get("/training", async (req, res) => {
  const { userId, teamId, tlId, status, month, year, trainer, topic, userRole } = req.query;
  let records = await db.select().from(trainingRecordsTable);

  if (userId) records = records.filter(r => r.userId === parseInt(userId as string));
  
  // Filter by specific team
  if (teamId) {
    records = records.filter(r => r.teamId === parseInt(teamId as string));
  }
  // OR filter by TL - get all teams managed by this TL
  else if (tlId) {
    const tlTeams = await db.select().from(teamsTable).where(eq(teamsTable.tlId, parseInt(tlId as string)));
    const teamIds = tlTeams.map(t => t.id);
    const employees = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "employee"));
    const employeeIds = new Set(employees.map((employee) => employee.id));
    records = records.filter(r => r.teamId && teamIds.includes(r.teamId) && r.userId && employeeIds.has(r.userId));
  }
  if (status) records = records.filter(r => r.status === status);
  if (trainer) records = records.filter(r => r.trainer?.toLowerCase().includes((trainer as string).toLowerCase()));
  if (topic) records = records.filter(r => r.topic?.toLowerCase().includes((topic as string).toLowerCase()));
  if (userRole) {
    const users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, userRole as string));
    const userIds = new Set(users.map((user) => user.id));
    records = records.filter((record) => record.userId !== null && userIds.has(record.userId));
  }
  if (month) {
    records = records.filter(r => {
      if (!r.startDate) return true;
      const d = new Date(r.startDate + "T00:00:00Z");
      return d.getUTCMonth() + 1 === parseInt(month as string);
    });
  }
  if (year) {
    records = records.filter(r => {
      if (!r.startDate) return true;
      const d = new Date(r.startDate + "T00:00:00Z");
      return d.getUTCFullYear() === parseInt(year as string);
    });
  }

  const enriched = await Promise.all(records.map(enrichTraining));
  res.json(enriched);
});

router.post("/training", async (req, res) => {
  const { topic, status, ...rest } = req.body;
  if (!topic) return res.status(400).json({ error: "topic required" });

  const [record] = await db.insert(trainingRecordsTable).values({
    topic,
    status: status ?? "yts",
    category: rest.category ?? null,
    trainer: rest.trainer ?? null,
    startDate: rest.startDate ?? null,
    endDate: rest.endDate ?? null,
    progressPct: rest.progressPct ?? 0,
    remarks: rest.remarks ?? null,
    userId: rest.userId ?? null,
    teamId: rest.teamId ?? null,
  }).returning();

  res.status(201).json(await enrichTraining(record));
});

router.get("/training/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [record] = await db.select().from(trainingRecordsTable).where(eq(trainingRecordsTable.id, id));
  if (!record) return res.status(404).json({ error: "Not found" });
  res.json(await enrichTraining(record));
});

router.patch("/training/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const updates: Partial<typeof trainingRecordsTable.$inferInsert> = {};
  const fields = ["topic", "category", "trainer", "startDate", "endDate", "status", "progressPct", "remarks"];
  for (const f of fields) {
    if (req.body[f] !== undefined) (updates as any)[f] = req.body[f];
  }
  const [record] = await db.update(trainingRecordsTable).set(updates).where(eq(trainingRecordsTable.id, id)).returning();
  if (!record) return res.status(404).json({ error: "Not found" });
  res.json(await enrichTraining(record));
});

router.delete("/training/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [record] = await db.select().from(trainingRecordsTable).where(eq(trainingRecordsTable.id, id));
  if (!record) return res.status(404).json({ error: "Not found" });
  await db.delete(trainingRecordsTable).where(eq(trainingRecordsTable.id, id));
  await notifyEmployeeRecordDeleted(record.userId, record.teamId, "Training Record", record.topic, record.id);
  res.status(204).send();
});

export default router;
