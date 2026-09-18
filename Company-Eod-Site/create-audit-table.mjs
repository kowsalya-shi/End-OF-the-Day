import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function createAuditTable() {
  try {
    await client.connect();
    console.log('Connected to database...');
    
    // Create audit_log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_name TEXT NOT NULL,
        action TEXT NOT NULL,
        module TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        record_title TEXT,
        record_details JSONB,
        deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT
      );
    `);
    console.log('✓ audit_log table created');

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_log_module ON audit_log(module);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_log_deleted_at ON audit_log(deleted_at DESC);');
    console.log('✓ Indexes created');

    console.log('\n✅ Audit log table setup complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

createAuditTable();
