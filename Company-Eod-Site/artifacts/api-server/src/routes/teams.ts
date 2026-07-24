import { Router } from "express";
import { db, teamsTable, usersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

const router = Router();

async function enrichTeam(team: typeof teamsTable.$inferSelect) {
  let tlName: string | null = null;
  let managerName: string | null = null;

  if (team.tlId) {
    const [tl] = await db.select().from(usersTable).where(eq(usersTable.id, team.tlId));
    tlName = tl?.name ?? null;
  }
  if (team.managerId) {
    const [manager] = await db.select().from(usersTable).where(eq(usersTable.id, team.managerId));
    managerName = manager?.name ?? null;
  }

  const [{ value: memberCount }] = await db
    .select({ value: count() })
    .from(usersTable)
    .where(eq(usersTable.teamId, team.id));

  return {
    id: team.id,
    name: team.name,
    tlId: team.tlId,
    tlName,
    managerId: team.managerId,
    managerName,
    memberCount: Number(memberCount),
    createdAt: team.createdAt?.toISOString(),
  };
}

router.get("/teams", async (req, res) => {
  const teams = await db.select().from(teamsTable);
  const enriched = await Promise.all(teams.map(enrichTeam));
  res.json(enriched);
});

router.post("/teams", async (req, res) => {
  const { name, tlId, managerId } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const [team] = await db.insert(teamsTable).values({ name, tlId: tlId ?? null, managerId: managerId ?? null }).returning();
  res.status(201).json(await enrichTeam(team));
});

router.get("/teams/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) return res.status(404).json({ error: "Not found" });
  res.json(await enrichTeam(team));
});

router.patch("/teams/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, tlId, managerId } = req.body;
  const updates: Partial<typeof teamsTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (tlId !== undefined) updates.tlId = tlId;
  if (managerId !== undefined) updates.managerId = managerId;
  const [team] = await db.update(teamsTable).set(updates).where(eq(teamsTable.id, id)).returning();
  if (!team) return res.status(404).json({ error: "Not found" });
  res.json(await enrichTeam(team));
});

router.delete("/teams/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(teamsTable).where(eq(teamsTable.id, id));
  res.status(204).send();
});

export default router;
