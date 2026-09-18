import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function addAssignmentStatus() {
  try {
    await client.connect();
    console.log('Connected to database...');
    
    // Check if column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'internal_tasks' 
      AND column_name = 'assignment_status'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✓ assignment_status column already exists');
    } else {
      // Add assignment_status column
      await client.query(`
        ALTER TABLE internal_tasks 
        ADD COLUMN assignment_status TEXT DEFAULT 'accepted'
      `);
      console.log('✓ Added assignment_status column');
    }

    // Add assigned_at column
    const checkAssignedAt = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'internal_tasks' 
      AND column_name = 'assigned_at'
    `);

    if (checkAssignedAt.rows.length > 0) {
      console.log('✓ assigned_at column already exists');
    } else {
      await client.query(`
        ALTER TABLE internal_tasks 
        ADD COLUMN assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✓ Added assigned_at column');
    }

    // Add accepted_at column
    const checkAcceptedAt = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'internal_tasks' 
      AND column_name = 'accepted_at'
    `);

    if (checkAcceptedAt.rows.length > 0) {
      console.log('✓ accepted_at column already exists');
    } else {
      await client.query(`
        ALTER TABLE internal_tasks 
        ADD COLUMN accepted_at TIMESTAMP WITH TIME ZONE
      `);
      console.log('✓ Added accepted_at column');
    }

    // Add declined_at column
    const checkDeclinedAt = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'internal_tasks' 
      AND column_name = 'declined_at'
    `);

    if (checkDeclinedAt.rows.length > 0) {
      console.log('✓ declined_at column already exists');
    } else {
      await client.query(`
        ALTER TABLE internal_tasks 
        ADD COLUMN declined_at TIMESTAMP WITH TIME ZONE
      `);
      console.log('✓ Added declined_at column');
    }

    // Add decline_reason column
    const checkDeclineReason = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'internal_tasks' 
      AND column_name = 'decline_reason'
    `);

    if (checkDeclineReason.rows.length > 0) {
      console.log('✓ decline_reason column already exists');
    } else {
      await client.query(`
        ALTER TABLE internal_tasks 
        ADD COLUMN decline_reason TEXT
      `);
      console.log('✓ Added decline_reason column');
    }

    // Add reassignment_requested column
    const checkReassignmentRequested = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'internal_tasks' 
      AND column_name = 'reassignment_requested'
    `);

    if (checkReassignmentRequested.rows.length > 0) {
      console.log('✓ reassignment_requested column already exists');
    } else {
      await client.query(`
        ALTER TABLE internal_tasks 
        ADD COLUMN reassignment_requested BOOLEAN DEFAULT FALSE
      `);
      console.log('✓ Added reassignment_requested column');
    }

    // Add reassignment_reason column
    const checkReassignmentReason = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'internal_tasks' 
      AND column_name = 'reassignment_reason'
    `);

    if (checkReassignmentReason.rows.length > 0) {
      console.log('✓ reassignment_reason column already exists');
    } else {
      await client.query(`
        ALTER TABLE internal_tasks 
        ADD COLUMN reassignment_reason TEXT
      `);
      console.log('✓ Added reassignment_reason column');
    }

    // Update existing tasks to have 'accepted' status (backward compatibility)
    const updateResult = await client.query(`
      UPDATE internal_tasks 
      SET assignment_status = 'accepted',
          accepted_at = COALESCE(created_at, CURRENT_TIMESTAMP)
      WHERE assignment_status IS NULL OR assignment_status = ''
    `);
    console.log(`✓ Updated ${updateResult.rowCount} existing tasks to 'accepted' status`);

    // Show updated table structure
    const columns = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'internal_tasks'
      AND column_name IN (
        'assignment_status', 
        'assigned_at', 
        'accepted_at', 
        'declined_at', 
        'decline_reason',
        'reassignment_requested',
        'reassignment_reason'
      )
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Assignment-related columns in internal_tasks:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.column_default ? `(default: ${col.column_default})` : ''}`);
    });

    console.log('\n✅ Database migration complete!');
    console.log('\nAssignment status values:');
    console.log('  - pending: Task assigned but not yet accepted by assignee');
    console.log('  - accepted: Task accepted by assignee (default for existing tasks)');
    console.log('  - declined: Task declined by assignee');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

addAssignmentStatus();
