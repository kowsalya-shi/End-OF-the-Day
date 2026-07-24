# PostgreSQL Installation Required

## ⚠️ **Your project needs PostgreSQL to run**

The backend API cannot start without a PostgreSQL database.

## 📥 **Install PostgreSQL Now**

### Option 1: Download Installer (Recommended)
1. Download from: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
2. Choose **PostgreSQL 16** for Windows x86-64
3. Run the installer
4. **IMPORTANT**: Remember the password you set for the `postgres` user!
5. Use default port: **5432**
6. Install all components

### Option 2: Use Winget (Command Line)
Run this in **PowerShell as Administrator**:
```powershell
winget install --id PostgreSQL.PostgreSQL.16 -e
```

## ⚙️ **After Installation**

1. **Add PostgreSQL to PATH** (if not done automatically):
   - Search "Environment Variables" in Windows
   - Add `C:\Program Files\PostgreSQL\16\bin` to System PATH
   - Restart your terminal

2. **Verify Installation**:
```cmd
psql --version
```

3. **Create Database**:
```cmd
# Connect to PostgreSQL
psql -U postgres

# Inside psql, run:
CREATE DATABASE eod_db;
\q
```

4. **Update .env file**:
Create `.env` in project root with:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/eod_db
```
Replace `YOUR_PASSWORD` with the password you set during installation.

5. **Push Database Schema**:
```cmd
cd lib\db
set DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/eod_db
pnpm run push
```

6. **Seed Database with Users**:
```cmd
cd lib\db
node seed.mjs
```

## 🚀 **Then Start Everything**

```cmd
# In terminal 1 - API Server
cd artifacts\api-server
set PORT=8080
set DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/eod_db
node dist\index.mjs

# In terminal 2 - Frontend (already running)
# Just refresh your browser at http://localhost:23881
```

## 🔑 **Login Credentials**

After seeding, use:
- **TL Waseem**: waseem@arraafiinfotech.com / tl123
- **Employee Kowsalya**: kowsalya@arraafiinfotech.com / emp123

---

**PostgreSQL is required - there's no way around it for this project!**
