// Script to run Prisma commands during Vercel build
const { execSync } = require('child_process');

// Log the start of Prisma setup
console.log('🔄 Setting up Prisma for Vercel deployment...');

try {
  // Run Prisma generate
  console.log('📦 Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Optional: Run database migrations if needed
  // Uncomment the following lines if you want to run migrations during deployment
  // console.log('🛠️ Running database migrations...');
  // execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  console.log('✅ Prisma setup complete!');
} catch (error) {
  console.error('❌ Error during Prisma setup:', error);
  process.exit(1);
} 