// Script to check which database the migration will connect to
// This helps verify you're connecting to the correct database before running migrations

import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;

console.log('🔍 Database Connection Check\n');
console.log('='.repeat(70));
console.log(`Current NODE_ENV: ${env}`);
console.log(`Loading from: ${envFile}\n`);

if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
  console.log(`✅ Found ${envFile}`);
} else {
  dotenv.config();
  console.log(`⚠️  ${envFile} not found, using default .env`);
}

const dbURI = env === 'production'
  ? process.env.MONGODB_URI_PROD
  : process.env.MONGODB_URI_DEV;

if (!dbURI) {
  console.error('\n❌ ERROR: MONGODB_URI is not defined!');
  console.log(`\nExpected environment variable: ${env === 'production' ? 'MONGODB_URI_PROD' : 'MONGODB_URI_DEV'}`);
  console.log(`Please check your ${envFile} file.`);
  process.exit(1);
}

// Extract database name from connection string
let dbName = 'Unknown';
let dbHost = 'Unknown';
let isProduction = false;

try {
  // Parse MongoDB URI to extract info
  const uriMatch = dbURI.match(/mongodb(\+srv)?:\/\/([^:]+:[^@]+@)?([^/]+)\/([^?]+)/);
  if (uriMatch) {
    dbHost = uriMatch[3];
    dbName = uriMatch[4];
  }
  
  // Check if it's production
  isProduction = dbURI.includes('rootfin.onrender.com') || 
                 dbURI.includes('production') ||
                 dbHost.includes('production');
} catch (e) {
  // If parsing fails, just show the URI (masked)
}

console.log('\n📊 Database Connection Details:');
console.log('-'.repeat(70));
console.log(`Environment: ${env}`);
console.log(`Database Host: ${dbHost}`);
console.log(`Database Name: ${dbName}`);
console.log(`Is Production: ${isProduction ? '⚠️  YES' : '✅ NO (Development/Staging)'}`);

// Show masked URI (hide credentials)
const maskedURI = dbURI.replace(/(mongodb(\+srv)?:\/\/)([^:]+):([^@]+)@/, '$1***:***@');
console.log(`Connection String: ${maskedURI}`);

// Safety check
console.log('\n🛡️  Safety Checks:');
console.log('-'.repeat(70));

if (env !== 'production' && isProduction) {
  console.log('❌ WARNING: Non-production environment trying to connect to production DB!');
  console.log('   The migration script will ABORT to prevent accidental changes.');
  console.log('   To connect to production, set: NODE_ENV=production');
} else if (env === 'production') {
  console.log('⚠️  WARNING: You are about to connect to PRODUCTION database!');
  console.log('   Make sure you have:');
  console.log('   1. A complete database backup');
  console.log('   2. Tested the migration on development first');
  console.log('   3. Verified the connection string is correct');
} else {
  console.log('✅ Safe to proceed - connecting to development/staging database');
}

console.log('\n' + '='.repeat(70));
console.log('\n💡 To change the database:');
console.log(`   - Set NODE_ENV=production to use MONGODB_URI_PROD`);
console.log(`   - Set NODE_ENV=development to use MONGODB_URI_DEV`);
console.log(`   - Or modify ${envFile} file\n`);
