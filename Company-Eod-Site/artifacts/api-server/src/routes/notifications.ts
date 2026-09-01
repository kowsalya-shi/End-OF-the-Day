import { Router, type Request } from "express";
import {
  db,
  usersTable,
  teamsTable,
  eodSubmissionsTable,
  portalNotificationsTable,
  internalTasksTable,
  dailyWorkTable,
  trainingRecordsTable,
} from "@workspace/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import nodemailer from "nodemailer";
import { logger } from "../lib/logger";
import { sessions } from "./auth";

const router = Router();

// Create transporter — configure via env vars if available
function getTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  // Ethereal test account fallback for dev
  return null;
}

async function getPendingEmployees(date: string, teamId?: number) {
  const submitted = await db
    .select({ userId: eodSubmissionsTable.userId })
    .from(eodSubmissionsTable)
    .where(eq(eodSubmissionsTable.date, date));

  const submittedIds = new Set(submitted.map(s => s.userId));

  let employees = await db.select().from(usersTable).where(eq(usersTable.role, "employee"));
  if (teamId) employees = employees.filter(e => e.teamId === teamId);

  return employees.filter(e => !submittedIds.has(e.id));
}

function getSession(req: Request) {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith("Bearer ") ? sessions.get(authHeader.slice(7)) : undefined;
}

export async function createPortalNotification(recipientUserId: number, employeeId: number, type: string, title: string, message: string, targetDate: string) {
  const [existing] = await db.select({ id: portalNotificationsTable.id }).from(portalNotificationsTable).where(and(
    eq(portalNotificationsTable.recipientUserId, recipientUserId),
    eq(portalNotificationsTable.employeeId, employeeId),
    eq(portalNotificationsTable.type, type),
    eq(portalNotificationsTable.targetDate, targetDate),
  ));
  if (existing) return false;

  await db.insert(portalNotificationsTable).values({ recipientUserId, employeeId, type, title, message, targetDate });
  return true;
}

function todayLocal() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export async function notifyEmployeeRecordDeleted(
  employeeId: number | null,
  teamId: number | null,
  recordType: "Daily Work" | "EOD Report" | "Training Record",
  recordName: string,
  recordId: number,
) {
  if (!employeeId) return;

  const [employee] = await db.select().from(usersTable).where(eq(usersTable.id, employeeId));
  const effectiveTeamId = teamId ?? employee?.teamId;
  const recipients = new Set<number>();
  if (effectiveTeamId) {
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, effectiveTeamId));
    if (team?.tlId) recipients.add(team.tlId);
    if (team?.managerId) recipients.add(team.managerId);
  }

  const leadership = await db.select({ id: usersTable.id }).from(usersTable)
    .where(inArray(usersTable.role, ["manager", "ceo"]));
  leadership.forEach((user) => recipients.add(user.id));

  const employeeName = employee?.name ?? "An employee";
  const message = `${employeeName} deleted ${recordType.toLowerCase()} "${recordName}". Please review if follow-up is needed.`;
  await Promise.all([...recipients]
    .filter((recipientId) => recipientId !== employeeId)
    .map((recipientId) => createPortalNotification(
      recipientId,
      employeeId,
      `deleted_${recordType.toLowerCase().replaceAll(" ", "_")}_${recordId}`,
      `${recordType} Deleted`,
      message,
      todayLocal(),
    )));
}

function previousCalendarDate(date: string, daysBefore: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - daysBefore);
  return value.toISOString().slice(0, 10);
}

async function hasThreeConsecutiveMissedEods(employeeId: number, targetDate: string) {
  const dates = [0, 1, 2].map((daysBefore) => previousCalendarDate(targetDate, daysBefore));
  const submissions = await db
    .select({ date: eodSubmissionsTable.date })
    .from(eodSubmissionsTable)
    .where(and(
      eq(eodSubmissionsTable.userId, employeeId),
      inArray(eodSubmissionsTable.date, dates),
    ));

  // Submitting an EOD on any of these days breaks the escalation streak.
  return submissions.length === 0;
}

async function emailMissingEodToLeadership(
  employee: typeof usersTable.$inferSelect,
  team: typeof teamsTable.$inferSelect,
  targetDate: string,
) {
  const recipientIds = [...new Set([team.tlId, team.managerId].filter((id): id is number => id !== null))];
  if (!recipientIds.length) return { sent: false, recipients: [] as string[] };

  const recipients = await db.select({ email: usersTable.email }).from(usersTable).where(inArray(usersTable.id, recipientIds));
  const emails = [...new Set(recipients.map((recipient) => recipient.email).filter((email): email is string => !!email))];
  if (!emails.length) return { sent: false, recipients: emails };

  const subject = `[EOD Missing] ${employee.name} has not submitted EOD for ${targetDate}`;
  const html = `<p>Dear Team Lead / Manager,</p>
    <p><strong>${employee.name}</strong> (${employee.email}) has not submitted their EOD report for <strong>${targetDate}</strong>.</p>
    <p>Team: <strong>${team.name}</strong></p>
    <p>Please follow up with the employee.</p>
    <br/><p>Regards,<br/>Arraafi Task Management Portal</p>`;
  const transporter = getTransporter();
  if (!transporter) {
    logger.info({ to: emails, subject, employeeId: employee.id }, "DEV: Would send missing EOD leadership email");
    return { sent: true, recipients: emails };
  }

  try {
    await transporter.sendMail({
      from: `"Arraafi Task Management Portal" <${process.env.SMTP_USER ?? "noreply@arraafiinfotech.com"}>`,
      to: emails.join(", "),
      subject,
      html,
    });
    return { sent: true, recipients: emails };
  } catch (err) {
    logger.error({ err, employeeId: employee.id, to: emails }, "Failed to send missing EOD leadership email");
    return { sent: false, recipients: emails };
  }
}

export async function processMissingEodNotifications(targetDate: string) {
  const pending = await getPendingEmployees(targetDate);
  let created = 0;
  let emailsSent = 0;

  for (const employee of pending) {
    if (!employee.teamId) continue;
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, employee.teamId));
    if (!team) continue;

    const message = `${employee.name} did not submit an EOD for ${targetDate}.`;
    let isNewMissingEod = false;
    if (team.tlId && await createPortalNotification(team.tlId, employee.id, "missing_eod_tl", "Missing EOD", message, targetDate)) {
      created++;
      isNewMissingEod = true;
    }
    if (team.managerId && await createPortalNotification(team.managerId, employee.id, "missing_eod_manager", "Missing EOD", message, targetDate)) {
      created++;
      isNewMissingEod = true;
    }
    if (isNewMissingEod && (await emailMissingEodToLeadership(employee, team, targetDate)).sent) emailsSent++;

    if (!(await hasThreeConsecutiveMissedEods(employee.id, targetDate))) continue;

    const ceos = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "ceo"));
    const recipients = [team.managerId, ...ceos.map((ceo) => ceo.id)].filter((id): id is number => id !== null);
    const escalationMessage = `${employee.name} has not submitted an EOD for three consecutive days ending ${targetDate}. Please follow up with the employee.`;
    for (const recipientId of new Set(recipients)) {
      if (await createPortalNotification(recipientId, employee.id, "missing_eod_escalation", "EOD Escalation", escalationMessage, targetDate)) created++;
    }
  }

  return { pending: pending.length, created, emailsSent };
}

function isMoreThanOneWeekOld(itemDate: string | null, targetDate: string) {
  if (!itemDate) return false;
  const ageMs = Date.parse(`${targetDate}T00:00:00Z`) - Date.parse(`${itemDate}T00:00:00Z`);
  return ageMs > 7 * 24 * 60 * 60 * 1000;
}

async function notifyTlAboutOverdueItem(
  kind: "task" | "daily_work" | "training",
  itemId: number,
  title: string,
  itemDate: string | null,
  status: string,
  employeeId: number | null,
  teamId: number | null,
  targetDate: string,
) {
  if (!employeeId || !teamId || !isMoreThanOneWeekOld(itemDate, targetDate)) return 0;
  if (status === "completed" || status === "cancelled") return 0;

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  const [employee] = await db.select().from(usersTable).where(eq(usersTable.id, employeeId));
  if (!team?.tlId || !employee || !itemDate) return 0;

  const notificationType = `overdue_${kind}_${itemId}`;
  const notificationTitle = `Overdue ${kind === "daily_work" ? "Daily Work" : kind === "training" ? "Training" : "Task"}`;
  const message = `${employee.name}'s ${kind === "daily_work" ? "daily work" : kind} "${title}" has been pending since ${itemDate}.`;
  return (await createPortalNotification(team.tlId, employeeId, notificationType, notificationTitle, message, itemDate)) ? 1 : 0;
}

export async function processOverdueWorkNotifications(targetDate: string) {
  let created = 0;
  const [tasks, dailyWork, training] = await Promise.all([
    db.select().from(internalTasksTable),
    db.select().from(dailyWorkTable),
    db.select().from(trainingRecordsTable),
  ]);

  for (const task of tasks) {
    created += await notifyTlAboutOverdueItem(
      "task", task.id, task.taskName, task.plannedEndDate ?? task.plannedStartDate,
      task.status, task.userId, task.teamId, targetDate,
    );
  }
  for (const work of dailyWork) {
    created += await notifyTlAboutOverdueItem(
      "daily_work", work.id, work.action, work.date,
      work.status, work.userId, work.teamId, targetDate,
    );
  }
  for (const record of training) {
    created += await notifyTlAboutOverdueItem(
      "training", record.id, record.topic, record.endDate ?? record.startDate,
      record.status, record.userId, record.teamId, targetDate,
    );
  }

  return { created };
}

router.get("/notifications", async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const notifications = await db.select().from(portalNotificationsTable)
    .where(eq(portalNotificationsTable.recipientUserId, session.userId))
    .orderBy(desc(portalNotificationsTable.createdAt))
    .limit(50);
  res.json(notifications);
});

router.post("/notifications/send-reminder", async (req, res) => {
  const { date, teamId } = req.body;
  const targetDate = date || new Date().toISOString().split("T")[0];

  try {
    const pending = await getPendingEmployees(targetDate, teamId);
    const transporter = getTransporter();

    let sent = 0;
    let failed = 0;

    for (const emp of pending) {
      logger.info({ empId: emp.id, email: emp.email }, "Sending reminder");
      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"Arraafi EOD System" <${process.env.SMTP_USER ?? "noreply@arraafiinfotech.com"}>`,
            to: emp.email,
            subject: "EOD Reminder - Please submit your EOD",
            html: `<p>Dear ${emp.name},</p>
                   <p>This is a reminder to submit your End of Day (EOD) report before <strong>5:45 PM</strong> today (${targetDate}).</p>
                   <p>Please log in to the EOD portal and submit your report.</p>
                   <br/><p>Regards,<br/>Arraafi Infotech HR Team</p>`,
          });
          sent++;
        } catch (err) {
          logger.error({ err, empId: emp.id }, "Failed to send reminder");
          failed++;
        }
      } else {
        // Log the email in dev mode
        logger.info({ to: emp.email, subject: "EOD Reminder" }, "DEV: Would send reminder email");
        sent++;
      }
    }

    res.json({
      success: true,
      sent,
      failed,
      message: `Reminder sent to ${sent} employees, ${failed} failed`,
    });
  } catch (err) {
    logger.error({ err }, "Error sending reminders");
    res.status(500).json({ success: false, sent: 0, failed: 0, message: "Internal error" });
  }
});

router.post("/notifications/send-escalation", async (req, res) => {
  const { date, teamId } = req.body;
  const targetDate = date || new Date().toISOString().split("T")[0];

  try {
    const pending = await getPendingEmployees(targetDate, teamId);
    const transporter = getTransporter();

    let sent = 0;
    let failed = 0;

    for (const emp of pending) {
      let tlEmail: string | null = null;
      let managerEmail: string | null = null;

      if (emp.teamId) {
        const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, emp.teamId));
        if (team?.tlId) {
          const [tl] = await db.select().from(usersTable).where(eq(usersTable.id, team.tlId));
          tlEmail = tl?.email ?? null;
        }
        if (team?.managerId) {
          const [manager] = await db.select().from(usersTable).where(eq(usersTable.id, team.managerId));
          managerEmail = manager?.email ?? null;
        }
      }

      const recipients = [...new Set([tlEmail, managerEmail].filter((email): email is string => !!email))].join(", ");
      if (!recipients) continue;
      const escalationBody = `<p>This is an automated escalation notification.</p>
        <p>Employee <strong>${emp.name}</strong> (${emp.email}) has <strong>not submitted</strong> their EOD report for <strong>${targetDate}</strong>.</p>
        <p>Please follow up with the employee accordingly.</p>
        <br/><p>Regards,<br/>Arraafi EOD System</p>`;

      logger.info({ empId: emp.id, recipients }, "Sending escalation");

      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"Arraafi EOD System" <${process.env.SMTP_USER ?? "noreply@arraafiinfotech.com"}>`,
            to: recipients,
            subject: `[ESCALATION] ${emp.name} has not submitted EOD for ${targetDate}`,
            html: escalationBody,
          });
          sent++;
        } catch (err) {
          logger.error({ err, empId: emp.id }, "Failed to send escalation");
          failed++;
        }
      } else {
        logger.info({ to: recipients, subject: "EOD Escalation", empName: emp.name }, "DEV: Would send escalation email");
        sent++;
      }
    }

    res.json({
      success: true,
      sent,
      failed,
      message: `Escalation sent for ${sent} employees, ${failed} failed`,
    });
  } catch (err) {
    logger.error({ err }, "Error sending escalations");
    res.status(500).json({ success: false, sent: 0, failed: 0, message: "Internal error" });
  }
});

export default router;
