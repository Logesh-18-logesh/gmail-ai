
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Client } = pkg;

async function initDatabase() {
  try {
    // Check if we can connect to the database
    const client = new Client({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/email_assistant'
    });
    
    await client.connect();
    console.log('✅ Database connection successful');
    
    // Test a simple query
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database query test:', result.rows[0]);
    
    await client.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n💡 To fix this:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Create the database: createdb email_assistant');
    console.log('3. Set DATABASE_URL environment variable');
  }
}

initDatabase();
