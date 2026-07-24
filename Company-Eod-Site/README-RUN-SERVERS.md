# How to Run the EOD Management System

## Quick Start (Easiest Way)

### Option 1: Start Everything at Once
Double-click on: **`start-all.bat`**

This will open 2 windows:
- Backend Server (port 8080)
- Frontend Server (port 23881)

Then open your browser at: **http://localhost:23881**

---

## Manual Start (If you want to run them separately)

### Option 2: Start Backend Only
Double-click on: **`start-backend.bat`**

Backend will run at: http://localhost:8080

### Option 3: Start Frontend Only
Double-click on: **`start-frontend.bat`**

Frontend will run at: http://localhost:23881

---

## Using Command Line (PowerShell)

### Start Backend:
```powershell
cd "C:\Users\Shiny\OneDrive - Arraafi Infotech\Documents\Company-Eod-Site\Company-Eod-Site"
.\start-backend.bat
```

### Start Frontend:
```powershell
cd "C:\Users\Shiny\OneDrive - Arraafi Infotech\Documents\Company-Eod-Site\Company-Eod-Site"
.\start-frontend.bat
```

### Start Both:
```powershell
cd "C:\Users\Shiny\OneDrive - Arraafi Infotech\Documents\Company-Eod-Site\Company-Eod-Site"
.\start-all.bat
```

---

## Login Credentials

### Manager
- Email: shinydora753152@gmail.com
- Password: manager123

### HR
- Email: athishiny0@gmail.com
- Password: hr123

### Team Leaders (All use password: tl123)
- Soubhagya: soubhagya@arraafiinfotech.com
- Waseem: waseem@arraafiinfotech.com
- Javeed: javed@arraafiinfotech.com
- Rajshekar: rajshekar@arraafiinfotech.com

### Employees (All use password: emp123)
- Kowsalya: kowsalya@arraafiinfotech.com
- Giri: giri.g@arraafiinfotech.com
- (... and all other employees)

---

## Stopping the Servers

Press **Ctrl+C** in the command window and type **Y** to stop the server.

Or simply close the command windows.

---

## Troubleshooting

### Port Already in Use
If you get "port already in use" error:

**For Backend (port 8080):**
```powershell
netstat -ano | findstr :8080
taskkill /PID <PID_NUMBER> /F
```

**For Frontend (port 23881):**
```powershell
netstat -ano | findstr :23881
taskkill /PID <PID_NUMBER> /F
```

### Database Connection Error
Make sure PostgreSQL is running:
1. Open Services (services.msc)
2. Find "postgresql-x64-17"
3. Make sure it's "Running"

---

## Requirements

- **Node.js** installed
- **PostgreSQL** installed and running
- **pnpm** installed globally: `npm install -g pnpm`
- Database **eod_db** created and configured

---

## Need Help?

Check the console output in the command windows for error messages.
