import { Router } from "express";
import { db, usersTable, teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { randomInt } from "crypto";
import nodemailer from "nodemailer";
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
const passwordResetCodes = new Map<string, { code: string; expiresAt: number }>();

function mailTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: (process.env.SMTP_SSL ?? process.env.SMTP_SECURE) === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS },
  });
}

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

  if (user.status === "inactive") {
    return res.status(403).json({ error: "This user account is inactive. Please contact your manager." });
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
      status: user.status,
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

router.post("/auth/forgot-password", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  // Do not reveal whether an email address exists.
  const accepted = { success: true, message: "If this email is registered, a reset code has been sent." };
  if (!email) return res.status(200).json(accepted);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) return res.status(200).json(accepted);

  const code = String(randomInt(100000, 1000000));
  passwordResetCodes.set(email, { code, expiresAt: Date.now() + 15 * 60 * 1000 });
  const transporter = mailTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({ from: `"Arraafi Task Management Portal" <${process.env.SMTP_USER}>`, to: user.email, subject: "Password reset code", html: `<p>Your password reset code is <strong>${code}</strong>.</p><p>It expires in 15 minutes.</p>` });
    } catch (err) {
      logger.error({ err, email }, "Unable to send password reset email");
    }
  } else {
    logger.warn({ email }, "Password reset requested but SMTP is not configured");
  }
  res.status(200).json(accepted);
});

router.post("/auth/reset-password", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !code || password.length < 8) return res.status(400).json({ error: "Email, reset code, and a password of at least 8 characters are required" });
  const reset = passwordResetCodes.get(email);
  if (!reset || reset.expiresAt < Date.now() || reset.code !== code) return res.status(400).json({ error: "The reset code is invalid or expired" });
  const [user] = await db.update(usersTable).set({ passwordHash: hashPassword(password) }).where(eq(usersTable.email, email)).returning();
  if (!user) return res.status(400).json({ error: "The reset request is invalid" });
  passwordResetCodes.delete(email);
  res.json({ success: true });
});

router.post("/auth/change-password", async (req, res) => {
  const authHeader = req.headers.authorization;
  const session = authHeader?.startsWith("Bearer ") ? sessions.get(authHeader.slice(7)) : undefined;
  const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  if (newPassword.length < 8) return res.status(400).json({ error: "New password must contain at least 8 characters" });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!user || user.passwordHash !== hashPassword(currentPassword)) return res.status(400).json({ error: "Current password is incorrect" });
  await db.update(usersTable).set({ passwordHash: hashPassword(newPassword) }).where(eq(usersTable.id, user.id));
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
