-- Create tables
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  tl_id INTEGER,
  manager_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  team_id INTEGER,
  employee_id TEXT,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS eod (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  date DATE NOT NULL,
  task_completed TEXT,
  task_pending TEXT,
  challenges TEXT,
  attendance_status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  task_name TEXT NOT NULL,
  task_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS daily_work (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  date DATE NOT NULL,
  action TEXT NOT NULL,
  who TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS training (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  training_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not-started',
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Insert teams
INSERT INTO teams (name) VALUES 
  ('FICO'),
  ('PP'),
  ('MM'),
  ('EWM'),
  ('SD'),
  ('Developer'),
  ('Sales'),
  ('Data Analysis'),
  ('ABAP');

-- Insert Manager (password: manager123)
INSERT INTO users (name, email, password_hash, role, employee_id, department) VALUES 
  ('Asim Alam', 'shinydora753152@gmail.com', 'e03baa22b268d2d6b5bb6f6b2a8e6c0f8e4f8d5c8f5c4a4b0f1e5e8c5d5f5a5c', 'manager', 'MGR001', 'Management');

-- Insert HR (password: hr123)
INSERT INTO users (name, email, password_hash, role, employee_id, department) VALUES 
  ('Thaseena Khanum', 'athishiny0@gmail.com', '8f9c8e5f5d5f5a5c8e03baa22b268d2d6b5bb6f6b2a8e6c0f8e4f8d5c8f5c4a4b', 'hr', 'HR001', 'Human Resources');

-- Insert Team Leaders (password: tl123)
INSERT INTO users (name, email, password_hash, role, team_id, employee_id, department) VALUES 
  ('SOUBHGYA', 'soubhgya@arraafiinfotech.com', 'c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5', 'tl', 1, 'TL001', 'FICO'),
  ('Waseem', 'waseem@arraafiinfotech.com', 'c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5', 'tl', 3, 'TL002', 'MM'),
  ('Javeed', 'javeed@arraafiinfotech.com', 'c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5', 'tl', 5, 'TL003', 'SD'),
  ('Rajshekar', 'rajshekar@arraafiinfotech.com', 'c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5', 'tl', 6, 'TL004', 'Developer');

-- Insert Employees (password: emp123)
INSERT INTO users (name, email, password_hash, role, team_id, employee_id, department) VALUES 
  ('Mohd Ibrahim', 'mohd.ibrahim@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 1, 'EMP001', 'FICO'),
  ('Disha', 'disha@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 1, 'EMP002', 'FICO'),
  ('Manjunath', 'manjunath@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 1, 'EMP003', 'FICO'),
  ('Roop', 'roop@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 1, 'EMP004', 'FICO'),
  ('Ashitosh', 'ashitosh@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 2, 'EMP005', 'PP'),
  ('Sharath', 'sharath@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 3, 'EMP006', 'MM'),
  ('Shabbir', 'shabbir@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 3, 'EMP007', 'MM'),
  ('Shubham', 'shubham@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 3, 'EMP008', 'MM'),
  ('Amita', 'amita@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 4, 'EMP009', 'EWM'),
  ('Yogesh', 'yogesh@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 4, 'EMP010', 'EWM'),
  ('Vickram', 'vickram@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 5, 'EMP011', 'SD'),
  ('Anuja', 'anuja@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 5, 'EMP012', 'SD'),
  ('Pradeep', 'pradeep@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 5, 'EMP013', 'SD'),
  ('Ayesha', 'ayesha@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 7, 'EMP014', 'Sales'),
  ('Aaron', 'aaron@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 7, 'EMP015', 'Sales'),
  ('Kowsalya', 'kowsalya@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 6, 'EMP016', 'Developer'),
  ('Giri', 'giri@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 6, 'EMP017', 'Developer'),
  ('Ankita', 'ankita@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 8, 'EMP018', 'Data Analysis'),
  ('Akanksha', 'akanksha@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 9, 'EMP019', 'ABAP'),
  ('Sanjay', 'sanjay@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 9, 'EMP020', 'ABAP'),
  ('Priya', 'priya@arraafiinfotech.com', 'd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', 'employee', 9, 'EMP021', 'ABAP');

-- Update teams with manager and TL IDs
UPDATE teams SET manager_id = 1, tl_id = 3 WHERE id = 1;
UPDATE teams SET manager_id = 1 WHERE id = 2;
UPDATE teams SET manager_id = 1, tl_id = 4 WHERE id = 3;
UPDATE teams SET manager_id = 1 WHERE id = 4;
UPDATE teams SET manager_id = 1, tl_id = 5 WHERE id = 5;
UPDATE teams SET manager_id = 1, tl_id = 6 WHERE id = 6;
UPDATE teams SET manager_id = 1 WHERE id = 7;
UPDATE teams SET manager_id = 1 WHERE id = 8;
UPDATE teams SET manager_id = 1 WHERE id = 9;
