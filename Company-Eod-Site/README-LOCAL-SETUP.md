# Local Development Setup for EOD Portal

## Prerequisites

You need to install:

1. **PostgreSQL** - Database server
   - Download from: https://www.postgresql.org/download/windows/
   - Or use Docker: `docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres`

2. **Node.js & pnpm** (Already installed ✓)

## Setup Steps

### 1. Database Setup

**Option A: Using PostgreSQL**
```cmd
# Create database
createdb eod_db

# Or connect to postgres and run:
psql -U postgres
CREATE DATABASE eod_db;
```

**Option B: Using Docker**
```cmd
docker run --name eod-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=eod_db -p 5432:5432 -d postgres
```

### 2. Environment Configuration

Copy the example environment file:
```cmd
copy .env.example .env
```

Edit `.env` and update the `DATABASE_URL` with your PostgreSQL connection string.

### 3. Install Dependencies

```cmd
pnpm install --ignore-scripts
```

### 4. Run Database Migrations

```cmd
cd lib\db
pnpm run db:push
```

### 5. Seed Database (Optional)

Run the seed script to add demo users:
```cmd
cd lib\db
pnpm run db:seed
```

### 6. Start Development Servers

**Terminal 1 - API Server:**
```cmd
cd artifacts\api-server
set NODE_ENV=development
set PORT=8080
pnpm run dev
```

**Terminal 2 - Frontend:**
```cmd
cd artifacts\eod-portal
set PORT=23881
set BASE_PATH=/
pnpm run dev
```

### 7. Access the Application

- Frontend: http://localhost:23881
- API: http://localhost:8080/api

## Demo Credentials

- **Manager**: shinydora753152@gmail.com / manager123
- **HR**: athishiny0@gmail.com / hr123
- **Team Lead**: rahul.singh@arraafiinfotech.com / tl123
- **Employee**: priya.sharma@arraafiinfotech.com / emp123

## Troubleshooting

### Port Already in Use
```cmd
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database `eod_db` exists

### Build Errors
```cmd
# Clear cache and reinstall
pnpm store prune
rm -rf node_modules
pnpm install --ignore-scripts
```
