/**
 * config/migrate.js — Run schema + seed demo users
 * Usage: node config/migrate.js
 */
require('dotenv').config();
const { pool } = require('./db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DEMO_USERS = [
  { name: 'Admin User',    email: 'admin@pos.com',   password: 'admin123',   role: 'admin'   },
  { name: 'Sarah Cashier', email: 'cashier@pos.com', password: 'cashier123', role: 'cashier' },
  { name: 'Rahim Waiter',  email: 'waiter@pos.com',  password: 'waiter123',  role: 'waiter'  },
  { name: 'Chef Karim',    email: 'chef@pos.com',    password: 'chef123',    role: 'chef'    },
];

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running schema...');
    const schema = fs.readFileSync(
      path.join(__dirname, '../../database/schema.sql'), 'utf8'
    );
    await client.query(schema);
    console.log('✅ Schema applied');

    console.log('🔄 Seeding demo users...');
    for (const u of DEMO_USERS) {
      const hashed = await bcrypt.hash(u.password, 12);
      await client.query(
        `INSERT INTO users (id, name, email, password, role)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (email) DO UPDATE SET password = $3`,
        [uuidv4(), u.name, u.email, hashed, u.role]
      );
      console.log(`  ✓ ${u.role}: ${u.email} / ${u.password}`);
    }
    console.log('\n🎉 Migration complete! You can now sign in at http://localhost:3000/login');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
