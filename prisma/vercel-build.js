// Script to run Prisma commands during Vercel build
const { execSync } = require('child_process');

// Log the start of Prisma setup
console.log('🔄 Setting up Prisma for Vercel deployment...');

try {
  // Run Prisma generate with debug mode to see more information
  console.log('📦 Generating Prisma Client...');
  execSync('npx prisma generate --debug', { stdio: 'inherit' });
  
  // Run database migrations with debug mode for better error reporting
  console.log('🛠️ Running database migrations...');
  execSync('npx prisma migrate deploy --debug', { stdio: 'inherit' });
  
  console.log('✅ Prisma setup complete!');
} catch (error) {
  console.error('❌ Error during Prisma setup:', error);
  
  // Print more debug information if available
  if (error.stdout) {
    console.error('STDOUT:', error.stdout.toString());
  }
  if (error.stderr) {
    console.error('STDERR:', error.stderr.toString());
  }
  
  // Log the Prisma version
  try {
    console.log('Prisma version:');
    execSync('npx prisma -v', { stdio: 'inherit' });
  } catch (e) {
    console.error('Could not determine Prisma version:', e);
  }
  
  process.exit(1);
} 