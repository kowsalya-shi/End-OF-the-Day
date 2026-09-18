import { Router } from "express";
import { db, usersTable, teamsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { hashPassword, sessions } from "./auth";

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
    status: user.status,
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
  const { name, email, role, password, teamId, employeeId, department, status } = req.body;
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
    status: status ?? "active",
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
  const { name, email, role, password, teamId, employeeId, department, status } = req.body;
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (role !== undefined) updates.role = role;
  if (password !== undefined) {
    if (typeof password !== "string" || password.length < 4) return res.status(400).json({ error: "Password must contain at least 4 characters" });
    updates.passwordHash = hashPassword(password);
  }
  if (teamId !== undefined) updates.teamId = teamId;
  if (employeeId !== undefined) updates.employeeId = employeeId;
  if (department !== undefined) updates.department = department;
  if (status !== undefined) {
    if (!["active", "inactive"].includes(status)) return res.status(400).json({ error: "Status must be active or inactive" });
    updates.status = status;
  }

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(await enrichUser(user));
});

// Managers and CEOs can give a user a new temporary password. Only its hash
// is stored; the existing password is never exposed by this endpoint.
router.post("/users/:id/reset-password", async (req, res) => {
  const authHeader = req.headers.authorization;
  const session = authHeader?.startsWith("Bearer ") ? sessions.get(authHeader.slice(7)) : undefined;
  if (!session || !["manager", "ceo"].includes(session.role)) return res.status(403).json({ error: "Manager or CEO access required" });
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (password.length < 8) return res.status(400).json({ error: "Temporary password must contain at least 8 characters" });
  const id = parseInt(req.params.id);
  const [user] = await db.update(usersTable).set({ passwordHash: hashPassword(password) }).where(eq(usersTable.id, id)).returning();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ success: true });
});

router.delete("/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.status(204).send();
});

export default router;
