#!/usr/bin/env node

const { execSync } = require('child_process');

// Check if we're in production environment
const isProduction = process.env.VERCEL_ENV === 'production';

console.log('🔍 Build Environment:', process.env.VERCEL_ENV || 'local');
console.log('📦 Production Build:', isProduction);

try {
  // Only deploy Convex in production
  if (isProduction) {
    console.log('🚀 Deploying Convex to production...');
    execSync('npx convex deploy', { stdio: 'inherit' });
    console.log('✅ Convex deployed successfully');
  } else {
    console.log('⏭️  Skipping Convex deployment (not production)');
    console.log('   Preview builds use the existing Convex deployment');
  }

  // Always build Next.js
  console.log('📦 Building Next.js...');
  execSync('next build', { stdio: 'inherit' });
  console.log('✅ Next.js build completed');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
