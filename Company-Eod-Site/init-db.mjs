import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function init() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const sql = `
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
  ('FICO'), ('PP'), ('MM'), ('EWM'), ('SD'), ('Developer'), ('Sales'), ('Data Analysis'), ('ABAP');

-- Insert Manager (password: manager123)
INSERT INTO users (name, email, password_hash, role, employee_id, department) VALUES 
  ('Asim Alam', 'shinydora753152@gmail.com', '3164a38b8bb4583573c1a865e2d601a10fa95d47c5b74998c798326288727eb4', 'manager', 'MGR001', 'Management');

-- Insert HR (password: hr123)
INSERT INTO users (name, email, password_hash, role, employee_id, department) VALUES 
  ('Thaseena Khanum', 'athishiny0@gmail.com', '37ca7991dfac562710e069a301a505c41bf9ac58e775693d14f4ef1ad1621bf8', 'hr', 'HR001', 'Human Resources');

-- Insert Team Leaders (password: tl123)
INSERT INTO users (name, email, password_hash, role, team_id, employee_id, department) VALUES 
  ('SOUBHGYA', 'soubhgya@arraafiinfotech.com', '68df2b0591c3fd713ab420a88ff5b49b870ee2d1b529e194d61bbcf17b33e9f4', 'tl', 1, 'TL001', 'FICO'),
  ('Waseem', 'waseem@arraafiinfotech.com', '68df2b0591c3fd713ab420a88ff5b49b870ee2d1b529e194d61bbcf17b33e9f4', 'tl', 3, 'TL002', 'MM'),
  ('Javeed', 'javeed@arraafiinfotech.com', '68df2b0591c3fd713ab420a88ff5b49b870ee2d1b529e194d61bbcf17b33e9f4', 'tl', 5, 'TL003', 'SD'),
  ('Rajshekar', 'rajshekar@arraafiinfotech.com', '68df2b0591c3fd713ab420a88ff5b49b870ee2d1b529e194d61bbcf17b33e9f4', 'tl', 6, 'TL004', 'Developer');

-- Insert Employees (password: emp123)
INSERT INTO users (name, email, password_hash, role, team_id, employee_id, department) VALUES 
  ('Mohd Ibrahim', 'mohd.ibrahim@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 1, 'EMP001', 'FICO'),
  ('Disha', 'disha@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 1, 'EMP002', 'FICO'),
  ('Manjunath', 'manjunath@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 1, 'EMP003', 'FICO'),
  ('Roop', 'roop@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 1, 'EMP004', 'FICO'),
  ('Ashitosh', 'ashitosh@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 2, 'EMP005', 'PP'),
  ('Sharath', 'sharath@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 3, 'EMP006', 'MM'),
  ('Shabbir', 'shabbir@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 3, 'EMP007', 'MM'),
  ('Shubham', 'shubham@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 3, 'EMP008', 'MM'),
  ('Amita', 'amita@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 4, 'EMP009', 'EWM'),
  ('Yogesh', 'yogesh@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 4, 'EMP010', 'EWM'),
  ('Vickram', 'vickram@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 5, 'EMP011', 'SD'),
  ('Anuja', 'anuja@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 5, 'EMP012', 'SD'),
  ('Pradeep', 'pradeep@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 5, 'EMP013', 'SD'),
  ('Ayesha', 'ayesha@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 7, 'EMP014', 'Sales'),
  ('Aaron', 'aaron@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 7, 'EMP015', 'Sales'),
  ('Kowsalya', 'kowsalya@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 6, 'EMP016', 'Developer'),
  ('Giri', 'giri@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 6, 'EMP017', 'Developer'),
  ('Ankita', 'ankita@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 8, 'EMP018', 'Data Analysis'),
  ('Akanksha', 'akanksha@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 9, 'EMP019', 'ABAP'),
  ('Sanjay', 'sanjay@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 9, 'EMP020', 'ABAP'),
  ('Priya', 'priya@arraafiinfotech.com', '2c2575f0b82e51845e8f13ddb603ef89db67447dc65ccd103f429183258dd7a9', 'employee', 9, 'EMP021', 'ABAP');

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
`;

    await client.query(sql);
    console.log('✅ Database initialized successfully!\n');
    console.log('🔐 Login Credentials:');
    console.log('  TL Waseem:      waseem@arraafiinfotech.com / tl123');
    console.log('  Employee Kowsalya: kowsalya@arraafiinfotech.com / emp123');
    console.log('\n🌐 Open: http://localhost:23881');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

init();
