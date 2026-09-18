import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";
import { processMissingEodNotifications, processOverdueWorkNotifications, processAgeingTaskNotifications } from "./routes/notifications";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

function todayLocal() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function localDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function scheduleMissingEodNotifications() {
  const now = new Date();
  const runAt = new Date(now);
  // The application accepts EOD submissions from 8 AM until 9 PM; at 9 PM, missing-EOD alerts begin.
  runAt.setHours(21, 0, 0, 0);
  if (runAt <= now) runAt.setDate(runAt.getDate() + 1);

  setTimeout(async () => {
    try {
      const date = todayLocal();
      logger.info(await processMissingEodNotifications(date), "Processed 9 PM EOD notifications");
      logger.info(await processOverdueWorkNotifications(date), "Processed overdue work notifications");
      logger.info(await processAgeingTaskNotifications(date), "Processed ageing task notifications");
    } catch (err) {
      logger.error({ err }, "Failed to process 9 PM EOD notifications");
    }
    scheduleMissingEodNotifications();
  }, runAt.getTime() - now.getTime());
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  // Backfill yesterday's missed-EOD alerts after a restart or a missed 9 PM
  // scheduler run. This keeps the affected employee, their TL, Manager, and
  // IT Manager inboxes accurate even when the server was offline overnight.
  processMissingEodNotifications(localDateOffset(-1))
    .then((result) => logger.info(result, "Backfilled yesterday's missing EOD notifications"))
    .catch((error) => logger.error({ error }, "Failed to backfill yesterday's missing EOD notifications"));
  // Do not wait until 9 PM after a restart: existing overdue tasks must appear
  // immediately for TL, IT Manager, and Manager follow-up.
  processOverdueWorkNotifications(todayLocal())
    .then((result) => logger.info(result, "Processed overdue work notifications at startup"))
    .catch((error) => logger.error({ error }, "Failed to process startup overdue work notifications"));
  // Check for ageing tasks at startup
  processAgeingTaskNotifications(todayLocal())
    .then((result) => logger.info(result, "Processed ageing task notifications at startup"))
    .catch((error) => logger.error({ error }, "Failed to process ageing task notifications"));
  scheduleMissingEodNotifications();
});
