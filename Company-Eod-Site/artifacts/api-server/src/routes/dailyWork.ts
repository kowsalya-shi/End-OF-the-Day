import { Router } from "express";
import { db, dailyWorkTable, usersTable, teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

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

  const [item] = await db.insert(dailyWorkTable).values({
    action,
    date,
    status: status ?? "yts",
    how: rest.how ?? null,
    who: rest.who ?? null,
    startDate: rest.startDate ?? null,
    completionDate: rest.completionDate ?? null,
    completionPct: rest.completionPct ?? 0,
    remarks: rest.remarks ?? null,
    userId: rest.userId ?? null,
    teamId: rest.teamId ?? null,
  }).returning();

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
  const fields = ["action", "how", "who", "date", "startDate", "completionDate", "status", "completionPct", "remarks"];
  for (const f of fields) {
    if (req.body[f] !== undefined) (updates as any)[f] = req.body[f];
  }
  const [item] = await db.update(dailyWorkTable).set(updates).where(eq(dailyWorkTable.id, id)).returning();
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(await enrichWork(item));
});

router.delete("/daily-work/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(dailyWorkTable).where(eq(dailyWorkTable.id, id));
  res.status(204).send();
});

export default router;
