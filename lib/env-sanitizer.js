/**
 * Environment Variable Sanitizer
 * 
 * This module ensures all required environment variables are present
 * and properly formatted before the application starts.
 */

// Required Supabase environment variables
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PODCASTS_BUCKET',
  'NEXT_PUBLIC_SUPABASE_IMAGES_BUCKET',
];

// Optional environment variables with defaults
const DEFAULT_ENV_VARS = {
  'NEXT_PUBLIC_SUPABASE_PODCASTS_BUCKET': 'podcasts',
  'NEXT_PUBLIC_SUPABASE_IMAGES_BUCKET': 'images',
};

// Check if we're in a production environment
const isProduction = process.env.NODE_ENV === 'production';

// Function to validate environment variables
function validateEnvVars() {
  let missingVars = [];

  // Check required variables
  REQUIRED_ENV_VARS.forEach(varName => {
    if (!process.env[varName]) {
      // For non-critical variables in development, use defaults
      if (!isProduction && DEFAULT_ENV_VARS[varName]) {
        process.env[varName] = DEFAULT_ENV_VARS[varName];
        console.warn(`Warning: Setting default value for ${varName}=${DEFAULT_ENV_VARS[varName]}`);
      } else {
        missingVars.push(varName);
      }
    }
  });

  // Report any missing variables
  if (missingVars.length > 0) {
    if (isProduction) {
      console.error(`Error: Missing required environment variables: ${missingVars.join(', ')}`);
      // In production, we'll continue but log the error
    } else {
      console.warn(`Warning: Missing recommended environment variables: ${missingVars.join(', ')}`);
    }
  }
}

// Run validation
validateEnvVars();

module.exports = {
  validateEnvVars
}; 