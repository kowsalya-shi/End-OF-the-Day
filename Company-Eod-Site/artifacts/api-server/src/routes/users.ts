import { Router } from "express";
import { db, usersTable, teamsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "./auth";

const router = Router();

async function enrichUser(user: typeof usersTable.$inferSelect) {
  let teamName: string | null = null;
  if (user.teamId) {
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, user.teamId));
    teamName = team?.name ?? null;
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    teamId: user.teamId,
    teamName,
    employeeId: user.employeeId,
    department: user.department,
    createdAt: user.createdAt?.toISOString(),
  };
}

router.get("/users", async (req, res) => {
  const { role, teamId, tlId } = req.query;
  let users = await db.select().from(usersTable);
  
  if (role) users = users.filter(u => u.role === role);
  
  if (teamId) {
    users = users.filter(u => u.teamId === parseInt(teamId as string));
  } else if (tlId) {
    // Get all teams managed by this TL
    const teams = await db.select().from(teamsTable).where(eq(teamsTable.tlId, parseInt(tlId as string)));
    const teamIds = teams.map(t => t.id);
    // Filter ONLY EMPLOYEES belonging to any of these teams
    users = users.filter(u => u.role === 'employee' && u.teamId && teamIds.includes(u.teamId));
  }
  
  const enriched = await Promise.all(users.map(enrichUser));
  res.json(enriched);
});

router.post("/users", async (req, res) => {
  const { name, email, role, password, teamId, employeeId, department } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, password required" });
  }
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) return res.status(400).json({ error: "Email already in use" });

  const [user] = await db.insert(usersTable).values({
    name,
    email,
    passwordHash: hashPassword(password),
    role: role ?? "employee",
    teamId: teamId ?? null,
    employeeId: employeeId ?? null,
    department: department ?? null,
  }).returning();

  res.status(201).json(await enrichUser(user));
});

router.get("/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(await enrichUser(user));
});

router.patch("/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, email, role, teamId, employeeId, department } = req.body;
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (role !== undefined) updates.role = role;
  if (teamId !== undefined) updates.teamId = teamId;
  if (employeeId !== undefined) updates.employeeId = employeeId;
  if (department !== undefined) updates.department = department;

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(await enrichUser(user));
});

router.delete("/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.status(204).send();
});

export default router;
