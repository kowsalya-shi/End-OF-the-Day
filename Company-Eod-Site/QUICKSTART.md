# 🚀 Quick Start Guide

## What You Have

This is an **End-of-Day (EOD) Management Portal** for Arraafi Infotech with:
- **Frontend**: React + TypeScript + Vite (Port 23881)
- **Backend API**: Express + PostgreSQL (Port 8080)  
- **Database**: PostgreSQL with Drizzle ORM
- **4 Role Types**: Employee, Team Leader, Manager, HR

## 📋 Prerequisites

Install these first:

1. **PostgreSQL** (Required for database)
   - Download: https://www.postgresql.org/download/windows/
   - Default install is fine
   - Remember the password you set for the `postgres` user

2. **Node.js & pnpm** ✅ Already installed!

## ⚡ Quick Setup (5 minutes)

### Step 1: Setup Database

Open **pgAdmin** (comes with PostgreSQL) or use command line:

```cmd
# Connect to postgres
psql -U postgres

# Create database
CREATE DATABASE eod_db;

# Exit
\q
```

### Step 2: Configure Environment

```cmd
# Copy example file
copy .env.example .env
```

Open `.env` and update this line with your PostgreSQL password:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD_HERE@localhost:5432/eod_db
```

### Step 3: Install Dependencies

```cmd
pnpm install --ignore-scripts
```

### Step 4: Setup Database Schema

```cmd
cd lib\db
set DATABASE_URL=postgresql://postgres:YOUR_PASSWORD_HERE@localhost:5432/eod_db
pnpm run push
```

### Step 5: Seed Demo Data

```cmd
node seed.mjs
```

This creates demo users you can log in with!

### Step 6: Start the App

Double-click `start-dev.bat` or run:

```cmd
start-dev.bat
```

Choose option **3** to start both servers.

## 🎯 Access the App

**Frontend**: http://localhost:23881  
**API**: http://localhost:8080/api

## 🔐 Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Manager | shinydora753152@gmail.com | manager123 |
| HR | athishiny0@gmail.com | hr123 |
| Team Leader | rahul.singh@arraafiinfotech.com | tl123 |
| Employee | priya.sharma@arraafiinfotech.com | emp123 |

## 📱 Features by Role

### Employee
- Submit daily EOD reports
- View and manage tasks
- Log daily work activities
- Track training progress

### Team Leader (TL)
- All employee features
- View team member EODs
- Assign and track team tasks
- Monitor team performance

### Manager
- All TL features
- Manage users across teams
- Create and manage teams
- View notifications
- Access advanced analytics

### HR
- Manage all company users
- View company-wide EOD reports
- Track attendance and performance
- Send notifications

## 🛠️ Troubleshooting

### "Database connection failed"
- Check PostgreSQL is running: `pg_isready -U postgres`
- Verify DATABASE_URL in .env
- Make sure `eod_db` database exists

### "Port already in use"
```cmd
# Find what's using the port
netstat -ano | findstr :8080

# Kill the process
taskkill /PID <PID_NUMBER> /F
```

### "Module not found" errors
```cmd
# Reinstall dependencies
rm -rf node_modules
pnpm install --ignore-scripts
```

### API server won't start
```cmd
# Check if database schema is pushed
cd lib\db
pnpm run push-force
```

## 📝 Development Workflow

### Make changes to frontend:
```cmd
cd artifacts\eod-portal\src
# Edit files, Vite will hot-reload automatically
```

### Make changes to backend:
```cmd
cd artifacts\api-server\src
# Edit files, restart the API server
```

### Update database schema:
```cmd
cd lib\db\src\schema
# Edit schema files
cd ..\..
pnpm run push
```

## 🎨 Key Technologies

- **Frontend**: React 18, TypeScript, TailwindCSS, shadcn/ui
- **Routing**: Wouter (lightweight React router)
- **State**: React Query (TanStack Query)
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL, Drizzle ORM
- **Auth**: JWT tokens in localStorage

## 📚 Project Structure

```
Company-Eod-Site/
├── artifacts/
│   ├── api-server/          # Express backend
│   └── eod-portal/          # React frontend
├── lib/
│   ├── api-client-react/    # Auto-generated API hooks
│   ├── api-spec/            # OpenAPI specification
│   ├── api-zod/             # Zod validation schemas
│   └── db/                  # Database schema & migrations
└── scheduler/               # Python email scheduler (optional)
```

## 🚀 Next Steps

1. **Explore the app** with different role logins
2. **Submit an EOD** as an employee
3. **Create tasks** as a team leader
4. **Manage users** as a manager
5. **Customize** the UI in `artifacts/eod-portal/src`

## 💡 Tips

- Use the demo credentials to test different permission levels
- Check the browser console for API responses
- Database changes require restart of API server
- Frontend changes are instant with hot reload

---

Need help? Check `README-LOCAL-SETUP.md` for detailed information.
