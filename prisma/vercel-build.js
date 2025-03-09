// Script to run Prisma commands during Vercel build
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Log the start of Prisma setup
console.log('🔄 Setting up Prisma for Vercel deployment...');

// Verify environment variables
console.log('Checking environment variables...');
// For local testing, we'll look for the DATABASE_URL in .env files
if (!process.env.DATABASE_URL) {
  console.log('DATABASE_URL not found in environment, checking .env files...');
  try {
    // Try to load from .env file
    require('dotenv').config();
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is missing!');
      console.error('Please set this variable in your Vercel project settings.');
      process.exit(1);
    } else {
      console.log('✅ DATABASE_URL found in .env file');
    }
  } catch (error) {
    console.error('❌ DATABASE_URL environment variable is missing!');
    console.error('Please set this variable in your Vercel project settings.');
    process.exit(1);
  }
} else {
  console.log('✅ DATABASE_URL found in environment variables');
}

// Make sure the Prisma schema file exists
const schemaPath = path.join(__dirname, 'schema.prisma');
if (!fs.existsSync(schemaPath)) {
  console.error(`❌ Prisma schema file not found at ${schemaPath}`);
  process.exit(1);
}

// Display Prisma and Node.js versions for debugging
try {
  console.log('Environment information:');
  console.log(`Node.js version: ${process.version}`);
  const prismaVersion = execSync('npx prisma -v').toString().trim();
  console.log(`Prisma version: ${prismaVersion}`);
} catch (error) {
  console.warn('⚠️ Could not determine Prisma version:', error.message);
}

// Function to safely execute commands with better error handling
function safeExec(command, description) {
  console.log(`Running: ${command}`);
  try {
    const output = execSync(command, { 
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
    });
    console.log(`✅ ${description} successful!`);
    return output;
  } catch (error) {
    console.error(`❌ ${description} failed:`);
    console.error('Exit code:', error.status);
    
    if (error.stdout) {
      console.error('--- STDOUT ---');
      console.error(error.stdout.toString());
    }
    
    if (error.stderr) {
      console.error('--- STDERR ---');
      console.error(error.stderr.toString());
    }
    
    throw error;
  }
}

// Verify the schema is valid
try {
  console.log('Validating Prisma schema...');
  safeExec('npx prisma validate', 'Schema validation');
  
  // Generate the Prisma client
  console.log('📦 Generating Prisma Client...');
  safeExec('npx prisma generate', 'Prisma Client generation');
  
  // Run database migrations (if needed)
  console.log('🛠️ Running database migrations...');
  safeExec('npx prisma migrate deploy', 'Database migrations');
  
  console.log('✅ Prisma setup complete!');
} catch (error) {
  console.error('❌ Error during Prisma setup process');
  process.exit(1);
} 