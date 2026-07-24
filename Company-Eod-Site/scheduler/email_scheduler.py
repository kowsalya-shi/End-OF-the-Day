#!/usr/bin/env python3
"""
Arraafi Infotech EOD Email Scheduler
Automated email notifications for EOD submissions.

Schedule:
  17:30 (5:30 PM)  — Reminder to pending employees
  17:45 (5:45 PM)  — Urgent Reminder
  18:00 (6:00 PM)  — Escalation (Employee + TL + Manager)
  18:15 (6:15 PM)  — Summary Mail to Manager + HR
"""

import os
import time
import smtplib
import logging
import schedule
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import psycopg2
import psycopg2.extras

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "")
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_SECURE = os.environ.get("SMTP_SECURE", "false").lower() == "true"
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")

MANAGER_EMAIL = "shinydora753152@gmail.com"
MANAGER_NAME = "Asim Alam"
HR_EMAIL = "athishiny0@gmail.com"
HR_NAME = "Thaseena Khanum"
COMPANY_NAME = "Arraafi Infotech"
PORTAL_URL = os.environ.get("PORTAL_URL", "https://arraafiinfotech.replit.app")


# --------------------------------------------------------------------------- #
# Database helpers
# --------------------------------------------------------------------------- #

def get_db_conn():
    if not DATABASE_URL:
        logger.error("DATABASE_URL not set")
        return None
    try:
        return psycopg2.connect(DATABASE_URL)
    except Exception as exc:
        logger.error(f"DB connection failed: {exc}")
        return None


def get_pending_employees(target_date):
    conn = get_db_conn()
    if not conn:
        return []
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(
            "SELECT user_id FROM eod_submissions WHERE date = %s",
            (target_date,),
        )
        submitted_ids = {row["user_id"] for row in cur.fetchall()}

        cur.execute(
            """
            SELECT u.id, u.name, u.email, u.team_id,
                   t.name  AS team_name,
                   tl.email AS tl_email,  tl.name AS tl_name,
                   m.email  AS manager_email, m.name AS manager_name
            FROM   users u
            LEFT JOIN teams t  ON u.team_id   = t.id
            LEFT JOIN users tl ON t.tl_id      = tl.id
            LEFT JOIN users m  ON t.manager_id = m.id
            WHERE  u.role = 'employee'
            """,
        )
        all_employees = cur.fetchall()
        cur.close()
        conn.close()

        return [emp for emp in all_employees if emp["id"] not in submitted_ids]
    except Exception as exc:
        logger.error(f"Error fetching pending employees: {exc}")
        if conn:
            conn.close()
        return []


def get_eod_summary(target_date):
    conn = get_db_conn()
    if not conn:
        return [], []
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(
            """
            SELECT e.user_id, u.name, u.email,
                   t.name AS team_name, e.attendance_status
            FROM   eod_submissions e
            JOIN   users u ON e.user_id  = u.id
            LEFT JOIN teams t ON u.team_id = t.id
            WHERE  e.date = %s
            """,
            (target_date,),
        )
        submitted = cur.fetchall()
        submitted_ids = {row["user_id"] for row in submitted}

        cur.execute(
            """
            SELECT u.id, u.name, u.email, t.name AS team_name
            FROM   users u
            LEFT JOIN teams t ON u.team_id = t.id
            WHERE  u.role = 'employee'
            """,
        )
        all_employees = cur.fetchall()
        pending = [e for e in all_employees if e["id"] not in submitted_ids]

        cur.close()
        conn.close()
        return list(submitted), list(pending)
    except Exception as exc:
        logger.error(f"Error fetching EOD summary: {exc}")
        if conn:
            conn.close()
        return [], []


# --------------------------------------------------------------------------- #
# Email sending
# --------------------------------------------------------------------------- #

def send_email(to_list, subject, html_body):
    if isinstance(to_list, str):
        to_list = [to_list]
    to_list = list(dict.fromkeys(to_list))  # deduplicate, preserve order

    if not SMTP_HOST:
        logger.info("[DEV] Would send email:")
        logger.info(f"  To:      {', '.join(to_list)}")
        logger.info(f"  Subject: {subject}")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{COMPANY_NAME} EOD System <{SMTP_USER}>"
        msg["To"] = ", ".join(to_list)
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        if SMTP_SECURE:
            srv = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)
        else:
            srv = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            srv.starttls()

        srv.login(SMTP_USER, SMTP_PASS)
        srv.sendmail(SMTP_USER, to_list, msg.as_string())
        srv.quit()
        logger.info(f"Email sent → {', '.join(to_list)}")
        return True
    except Exception as exc:
        logger.error(f"Email send failed to {to_list}: {exc}")
        return False


# --------------------------------------------------------------------------- #
# HTML email templates
# --------------------------------------------------------------------------- #

def _base(header_bg, header_html, body_html):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Arraafi Infotech EOD</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#f1f5f9;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0"
       style="background:#ffffff;border-radius:12px;overflow:hidden;
              box-shadow:0 4px 28px rgba(0,0,0,0.09);max-width:100%;">

  <!-- HEADER -->
  <tr><td style="background:{header_bg};padding:30px 40px;text-align:center;">
    {header_html}
    <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">
      {COMPANY_NAME} &mdash; EOD Management Portal
    </p>
  </td></tr>

  <!-- BODY -->
  <tr><td style="padding:36px 40px;">{body_html}</td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#f8fafc;padding:18px 40px;text-align:center;
                 border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">
      {COMPANY_NAME} &middot; EOD Management System &middot; Automated Notification
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""


def reminder_html(name, target_date, is_urgent=False):
    color = "#f97316" if is_urgent else "#f59e0b"
    title = "🚨 URGENT: Submit EOD NOW!" if is_urgent else "⏰ EOD Submission Reminder"
    urgency = (
        "You only have <strong>15 minutes</strong> left to submit!"
        if is_urgent
        else "Please submit before <strong>5:45 PM</strong> today."
    )

    header = f'<h1 style="margin:0;color:#fff;font-size:21px;font-weight:700;">{title}</h1>'

    body = f"""
<p style="font-size:16px;color:#1e293b;margin:0 0 18px;">Dear <strong>{name}</strong>,</p>
<p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 20px;">
  You have <strong>not yet submitted</strong> your End-of-Day (EOD) report
  for <strong>{target_date}</strong>.
</p>
<div style="background:#fff7ed;border-left:4px solid {color};border-radius:6px;
            padding:14px 18px;margin:0 0 26px;">
  <p style="margin:0;font-size:14px;color:#9a3412;font-weight:500;">{urgency}</p>
</div>
<p style="font-size:14px;color:#64748b;line-height:1.8;margin:0 0 24px;">
  Please log in and fill in your EOD report including:
  attendance, tasks completed, internal work summary,
  training attended, and tomorrow&rsquo;s plan.
</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <a href="{PORTAL_URL}/employee/eod"
     style="display:inline-block;background:{color};color:#fff;font-size:15px;
            font-weight:600;text-decoration:none;padding:13px 38px;border-radius:8px;">
    Submit EOD Now &rarr;
  </a>
</td></tr></table>"""

    return _base(color, header, body)


def escalation_html(name, email, target_date, team_name, tl_name):
    header = """
<h1 style="margin:0;color:#fff;font-size:21px;font-weight:700;">🚨 EOD Escalation Notice</h1>"""

    body = f"""
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;
            padding:18px 20px;margin:0 0 24px;">
  <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;font-weight:700;
            color:#dc2626;letter-spacing:.5px;">Escalation Alert</p>
  <p style="margin:0;font-size:16px;color:#1e293b;font-weight:600;">
    {name} has NOT submitted EOD for {target_date}
  </p>
</div>

<table width="100%" cellpadding="0" cellspacing="0"
       style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:0 0 24px;">
  <tr style="background:#f8fafc;">
    <td style="padding:11px 16px;font-size:12px;font-weight:600;color:#64748b;
               width:38%;border-bottom:1px solid #e2e8f0;">Employee</td>
    <td style="padding:11px 16px;font-size:14px;color:#1e293b;
               border-bottom:1px solid #e2e8f0;">{name}</td>
  </tr>
  <tr>
    <td style="padding:11px 16px;font-size:12px;font-weight:600;color:#64748b;
               border-bottom:1px solid #e2e8f0;">Email</td>
    <td style="padding:11px 16px;font-size:14px;color:#1e293b;
               border-bottom:1px solid #e2e8f0;">{email}</td>
  </tr>
  <tr style="background:#f8fafc;">
    <td style="padding:11px 16px;font-size:12px;font-weight:600;color:#64748b;
               border-bottom:1px solid #e2e8f0;">Team</td>
    <td style="padding:11px 16px;font-size:14px;color:#1e293b;
               border-bottom:1px solid #e2e8f0;">{team_name or "N/A"}</td>
  </tr>
  <tr>
    <td style="padding:11px 16px;font-size:12px;font-weight:600;color:#64748b;
               border-bottom:1px solid #e2e8f0;">Team Leader</td>
    <td style="padding:11px 16px;font-size:14px;color:#1e293b;
               border-bottom:1px solid #e2e8f0;">{tl_name or "N/A"}</td>
  </tr>
  <tr style="background:#f8fafc;">
    <td style="padding:11px 16px;font-size:12px;font-weight:600;color:#64748b;">Date</td>
    <td style="padding:11px 16px;font-size:14px;color:#1e293b;">{target_date}</td>
  </tr>
</table>

<p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 24px;">
  This is an automated escalation. Please follow up with the employee
  to ensure their EOD is submitted or their absence is noted.
</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <a href="{PORTAL_URL}/manager/eod"
     style="display:inline-block;background:#dc2626;color:#fff;font-size:15px;
            font-weight:600;text-decoration:none;padding:13px 38px;border-radius:8px;">
    View Pending EODs &rarr;
  </a>
</td></tr></table>"""

    return _base("#dc2626", header, body)


def summary_html(target_date, submitted, pending):
    total = len(submitted) + len(pending)
    pct = round(len(submitted) / total * 100) if total else 0

    def row(emp, ok):
        status = emp.get("attendance_status", "present").capitalize() if ok else "Not Submitted"
        bg = "#dcfce7" if ok else "#fee2e2"
        fg = "#166534" if ok else "#dc2626"
        icon = "✓" if ok else "✗"
        return f"""
<tr>
  <td style="padding:9px 14px;font-size:13px;color:#1e293b;border-bottom:1px solid #f1f5f9;">
    {emp['name']}</td>
  <td style="padding:9px 14px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;">
    {emp.get('team_name') or 'N/A'}</td>
  <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;">
    <span style="background:{bg};color:{fg};font-size:11px;font-weight:600;
                 padding:2px 8px;border-radius:20px;">{icon} {status}</span>
  </td>
</tr>"""

    submitted_rows = "".join(row(e, True) for e in submitted)
    pending_rows = "".join(row(e, False) for e in pending)

    table_header = """
<tr style="background:#f8fafc;">
  <th style="padding:9px 14px;font-size:11px;font-weight:700;color:#64748b;
             text-align:left;text-transform:uppercase;letter-spacing:.4px;
             border-bottom:1px solid #e2e8f0;">Employee</th>
  <th style="padding:9px 14px;font-size:11px;font-weight:700;color:#64748b;
             text-align:left;text-transform:uppercase;letter-spacing:.4px;
             border-bottom:1px solid #e2e8f0;">Team</th>
  <th style="padding:9px 14px;font-size:11px;font-weight:700;color:#64748b;
             text-align:left;text-transform:uppercase;letter-spacing:.4px;
             border-bottom:1px solid #e2e8f0;">Status</th>
</tr>"""

    header = f"""
<h1 style="margin:0;color:#fff;font-size:21px;font-weight:700;">
  &#128202; EOD Daily Summary Report
</h1>
<p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.9);">{target_date}</p>"""

    body = f"""
<!-- Stats cards -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 30px;">
<tr>
  <td width="32%" style="text-align:center;background:#f0fdf4;padding:18px 10px;border-radius:8px;">
    <div style="font-size:32px;font-weight:700;color:#16a34a;">{len(submitted)}</div>
    <div style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;
                letter-spacing:.5px;margin-top:4px;">Submitted</div>
  </td>
  <td width="4%"></td>
  <td width="32%" style="text-align:center;background:#fef2f2;padding:18px 10px;border-radius:8px;">
    <div style="font-size:32px;font-weight:700;color:#dc2626;">{len(pending)}</div>
    <div style="font-size:11px;font-weight:700;color:#b91c1c;text-transform:uppercase;
                letter-spacing:.5px;margin-top:4px;">Pending</div>
  </td>
  <td width="4%"></td>
  <td width="32%" style="text-align:center;background:#eff6ff;padding:18px 10px;border-radius:8px;">
    <div style="font-size:32px;font-weight:700;color:#2563eb;">{pct}%</div>
    <div style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;
                letter-spacing:.5px;margin-top:4px;">Completion</div>
  </td>
</tr>
</table>

{f'''<h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 10px;">
  &#9989; Submitted ({len(submitted)})</h3>
<table width="100%" cellpadding="0" cellspacing="0"
       style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:0 0 26px;">
  {table_header}{submitted_rows}
</table>''' if submitted else ''}

{f'''<h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 10px;">
  &#10060; Not Submitted ({len(pending)})</h3>
<table width="100%" cellpadding="0" cellspacing="0"
       style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:0 0 26px;">
  {table_header}{pending_rows}
</table>''' if pending else ''}

<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <a href="{PORTAL_URL}/manager/eod"
     style="display:inline-block;background:#4f46e5;color:#fff;font-size:15px;
            font-weight:600;text-decoration:none;padding:13px 38px;border-radius:8px;">
    View Full EOD Dashboard &rarr;
  </a>
</td></tr></table>"""

    return _base("linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)", header, body)


# --------------------------------------------------------------------------- #
# Scheduled jobs
# --------------------------------------------------------------------------- #

def job_530_reminder():
    target_date = str(date.today())
    logger.info(f"[17:30] Reminder job — {target_date}")
    pending = get_pending_employees(target_date)
    logger.info(f"  {len(pending)} employees pending")
    for emp in pending:
        send_email(
            emp["email"],
            f"⏰ EOD Reminder — Please submit before 5:45 PM | {target_date}",
            reminder_html(emp["name"], target_date, is_urgent=False),
        )


def job_545_urgent():
    target_date = str(date.today())
    logger.info(f"[17:45] Urgent reminder job — {target_date}")
    pending = get_pending_employees(target_date)
    logger.info(f"  {len(pending)} employees still pending")
    for emp in pending:
        send_email(
            emp["email"],
            f"🚨 URGENT: EOD deadline NOW — Submit immediately | {target_date}",
            reminder_html(emp["name"], target_date, is_urgent=True),
        )


def job_600_escalation():
    target_date = str(date.today())
    logger.info(f"[18:00] Escalation job — {target_date}")
    pending = get_pending_employees(target_date)
    logger.info(f"  Escalating {len(pending)} employees")
    for emp in pending:
        recipients = [emp["email"]]
        if emp.get("tl_email"):
            recipients.append(emp["tl_email"])
        if emp.get("manager_email"):
            recipients.append(emp["manager_email"])
        if MANAGER_EMAIL not in recipients:
            recipients.append(MANAGER_EMAIL)

        send_email(
            recipients,
            f"[ESCALATION] {emp['name']} has not submitted EOD for {target_date}",
            escalation_html(
                emp["name"],
                emp["email"],
                target_date,
                emp.get("team_name"),
                emp.get("tl_name"),
            ),
        )


def job_615_summary():
    target_date = str(date.today())
    logger.info(f"[18:15] Summary job — {target_date}")
    submitted, pending = get_eod_summary(target_date)
    send_email(
        [MANAGER_EMAIL, HR_EMAIL],
        f"📊 EOD Daily Summary — {target_date} | {COMPANY_NAME}",
        summary_html(target_date, submitted, pending),
    )
    logger.info("  Summary sent to Manager and HR")


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

def main():
    logger.info(f"{'='*60}")
    logger.info(f"  {COMPANY_NAME} EOD Email Scheduler")
    logger.info(f"{'='*60}")

    if not DATABASE_URL:
        logger.warning("DATABASE_URL not set — DB queries will fail")
    if not SMTP_HOST:
        logger.warning("SMTP_HOST not set — running in DEV mode (emails logged only)")

    schedule.every().day.at("17:30").do(job_530_reminder)
    schedule.every().day.at("17:45").do(job_545_urgent)
    schedule.every().day.at("18:00").do(job_600_escalation)
    schedule.every().day.at("18:15").do(job_615_summary)

    logger.info("Scheduled jobs:")
    logger.info("  17:30 — Reminder email to pending employees")
    logger.info("  17:45 — Urgent reminder email")
    logger.info("  18:00 — Escalation to Employee + TL + Manager")
    logger.info("  18:15 — Summary report to Manager + HR")
    logger.info("Scheduler running (checks every 30 s). Press Ctrl+C to stop.")

    while True:
        schedule.run_pending()
        time.sleep(30)


if __name__ == "__main__":
    main()
