import { Router } from "express";
import { db, usersTable, teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { logger } from "../lib/logger";

const router = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "eod-salt-2024").digest("hex");
}

function makeToken(userId: number, role: string): string {
  const payload = `${userId}:${role}:${Date.now()}`;
  return Buffer.from(payload).toString("base64");
}

function parseToken(token: string): { userId: number; role: string } | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [userId, role] = decoded.split(":");
    return { userId: parseInt(userId), role };
  } catch {
    return null;
  }
}

// Store active sessions in memory (simple approach)
export const sessions: Map<string, { userId: number; role: string }> = new Map();

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const hash = hashPassword(password);
  if (user.passwordHash !== hash) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = makeToken(user.id, user.role);
  sessions.set(token, { userId: user.id, role: user.role });

  let teamName: string | null = null;
  if (user.teamId) {
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, user.teamId));
    teamName = team?.name ?? null;
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
      teamName,
      employeeId: user.employeeId,
      department: user.department,
      createdAt: user.createdAt?.toISOString(),
    },
    token,
  });
});

router.post("/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    sessions.delete(token);
  }
  res.json({ success: true });
});

router.get("/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const token = authHeader.slice(7);
  const session = sessions.get(token);
  if (!session) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  let teamName: string | null = null;
  if (user.teamId) {
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, user.teamId));
    teamName = team?.name ?? null;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    teamId: user.teamId,
    teamName,
    employeeId: user.employeeId,
    department: user.department,
    createdAt: user.createdAt?.toISOString(),
  });
});

export { hashPassword };
export default router;
