#!/usr/bin/env node

const { execSync } = require('child_process');

// Check if we're in production environment
const isProduction = process.env.VERCEL_ENV === 'production';

console.log('🔍 Build Environment:', process.env.VERCEL_ENV || 'local');
console.log('📦 Production Build:', isProduction);

try {
  // Deploy Convex before building Next.js
  // Note: Preview builds will use the same Convex deployment as production
  // This is acceptable for most use cases and avoids type generation issues
  console.log('🚀 Deploying Convex...');
  execSync('npx convex deploy --yes', { stdio: 'inherit' });
  console.log('✅ Convex deployed successfully');

  // Always build Next.js
  console.log('📦 Building Next.js...');
  execSync('next build', { stdio: 'inherit' });
  console.log('✅ Next.js build completed');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
