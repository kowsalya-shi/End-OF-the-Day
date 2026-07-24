# Arraafi Infotech EOD Management Portal

An internal company portal for daily End-of-Day (EOD) report submissions, task tracking, training management, and attendance — with role-based access for Employees, Team Leaders, Managers, and HR.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/eod-portal run dev` — run the EOD portal frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS + shadcn/ui + Recharts
- API: Express 5 + Orval codegen
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Email: Nodemailer (configure SMTP env vars)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/` — DB schema (users, teams, eod, tasks, dailyWork, training)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/eod-portal/src/` — React frontend (pages, components, contexts)

## Architecture decisions

- Simple token-based auth stored in memory (Map) — tokens are base64-encoded userId:role:timestamp
- Password hashing uses SHA-256 + a salt string (not bcrypt, to avoid native module issues)
- Role-based routing: employees see /employee/*, TLs see /tl/*, managers/HR see /manager/* and /hr/*
- Status colors are applied consistently via StatusBadge and AttendanceBadge shared components
- Notifications route logs email content in dev when SMTP is not configured

## Product

- **Employee Portal:** Submit daily EOD, track internal tasks, log daily work, record training, mark attendance
- **TL Portal:** View and review only their team's EODs, tasks, work, and training
- **Manager Portal:** Full dashboard across all teams, manage users/teams, trigger notifications
- **HR Portal:** Same as Manager but with HR email (athishiny0@gmail.com)
- **Notifications:** Automatic escalation emails to Manager (shinydora753152@gmail.com) for missing EODs

## Teams

| ID | Team |
|----|------|
| 1 | FICO |
| 2 | PP |
| 3 | Developer |
| 4 | MM |
| 5 | SD |
| 6 | EWM |
| 7 | ABAP |
| 8 | Sales |
| 9 | Data Analysis |

## Demo Credentials

| Role     | Name           | Email                                  | Password    | Team        |
|----------|----------------|----------------------------------------|-------------|-------------|
| Manager  | Asim Alam      | shinydora753152@gmail.com             | manager123  | —           |
| HR       | Thaseena Khanum| athishiny0@gmail.com                  | hr123       | —           |
| TL       | Soubhgya       | soubhgya@arraafiinfotech.com          | tl123       | FICO        |
| TL       | Waseem         | waseem@arraafiinfotech.com            | tl123       | MM          |
| TL       | Javeed         | javeed@arraafiinfotech.com            | tl123       | SD          |
| TL       | Rajshekar      | rajshekar@arraafiinfotech.com         | tl123       | Developer   |
| Employee | Mohd Ibrahim   | mohd.ibrahim@arraafiinfotech.com      | emp123      | FICO        |
| Employee | Disha          | disha@arraafiinfotech.com             | emp123      | FICO        |
| Employee | Manjunath      | manjunath@arraafiinfotech.com         | emp123      | FICO        |
| Employee | Roop           | roop@arraafiinfotech.com              | emp123      | FICO        |
| Employee | Ashitosh       | ashitosh@arraafiinfotech.com          | emp123      | PP          |
| Employee | Sharath        | sharath@arraafiinfotech.com           | emp123      | MM          |
| Employee | Shabbir        | shabbir@arraafiinfotech.com           | emp123      | MM          |
| Employee | Shubham        | shubham@arraafiinfotech.com           | emp123      | MM          |
| Employee | Amita          | amita@arraafiinfotech.com             | emp123      | EWM         |
| Employee | Yogesh         | yogesh@arraafiinfotech.com            | emp123      | EWM         |
| Employee | Vickram        | vickram@arraafiinfotech.com           | emp123      | SD          |
| Employee | Anuja          | anuja@arraafiinfotech.com             | emp123      | SD          |
| Employee | Pradeep        | pradeep@arraafiinfotech.com           | emp123      | SD          |
| Employee | Ayesha         | ayesha@arraafiinfotech.com            | emp123      | Sales       |
| Employee | Aaron          | aaron@arraafiinfotech.com             | emp123      | Sales       |
| Employee | Kowsalya       | kowsalya@arraafiinfotech.com          | emp123      | Developer   |
| Employee | Giri           | giri@arraafiinfotech.com              | emp123      | Developer   |
| Employee | Ankita         | ankita@arraafiinfotech.com            | emp123      | Data Analysis|
| Employee | Akanksha       | akanksha@arraafiinfotech.com          | emp123      | ABAP        |
| Employee | Sanjay         | sanjay@arraafiinfotech.com            | emp123      | ABAP        |
| Employee | Priya          | priya@arraafiinfotech.com             | emp123      | ABAP        |

## Email Configuration (SMTP)

To enable real email notifications, set these environment variables:
- `SMTP_HOST` — SMTP server host
- `SMTP_PORT` — SMTP port (default: 587)
- `SMTP_SECURE` — "true" for SSL (default: false)
- `SMTP_USER` — SMTP username/email
- `SMTP_PASS` — SMTP password

Without these, notifications are logged to the server console (dev mode).

## Gotchas

- Always re-run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- The `pnpm --filter @workspace/db run push` command only works in dev — production schema changes go through the Publish flow
- Notification emails require SMTP env vars to send real emails

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
