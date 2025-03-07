/**
 * Database setup script for local development
 * Run with: node scripts/setup-db.js
 */

const { Client } = require('pg');
const { execSync } = require('child_process');
require('dotenv').config();

async function setupDatabase() {
  // Connect to PostgreSQL server to create the database
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres', // Connect to default postgres database initially
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL server');

    // Check if database exists
    const dbCheckResult = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'podcast_app'"
    );

    // Create the database if it doesn't exist
    if (dbCheckResult.rows.length === 0) {
      console.log('Creating podcast_app database...');
      await client.query('CREATE DATABASE podcast_app');
      console.log('Database created successfully');
    } else {
      console.log('Database already exists, skipping creation');
    }

    // Close the connection to the default database
    await client.end();
    console.log('Disconnected from PostgreSQL server');

    // Run Prisma migrations
    console.log('Running Prisma migrations...');
    execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase(); 