import { Router } from "express";
import { db, usersTable, teamsTable, eodSubmissionsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import nodemailer from "nodemailer";
import { logger } from "../lib/logger";

const router = Router();

const MANAGER_EMAIL = "shinydora753152@gmail.com";
const CEO_EMAIL = "athishiny0@gmail.com";

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

  let employees = await db.select().from(usersTable).where(inArray(usersTable.role, ["employee", "tl"]));
  if (teamId) employees = employees.filter(e => e.teamId === teamId);

  return employees.filter(e => !submittedIds.has(e.id));
}

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
      let managerEmail: string | null = MANAGER_EMAIL;

      if (emp.teamId) {
        const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, emp.teamId));
        if (team?.tlId) {
          const [tl] = await db.select().from(usersTable).where(eq(usersTable.id, team.tlId));
          tlEmail = tl?.email ?? null;
        }
      }

      const recipients = [emp.email, tlEmail, managerEmail, CEO_EMAIL].filter(Boolean).join(", ");
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
