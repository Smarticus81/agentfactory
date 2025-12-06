#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if we're in production environment
const isProduction = process.env.VERCEL_ENV === 'production';
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

console.log('🔍 Build Environment:', process.env.VERCEL_ENV || 'local');
console.log('📦 Production Build:', isProduction);

try {
  // Handle Convex deployment and code generation
  if (isProduction) {
    // Production: Deploy to Convex
    console.log('🚀 Deploying Convex to production...');
    execSync('npx convex deploy --yes', { stdio: 'inherit' });
    console.log('✅ Convex deployed successfully');
  } else {
    // Preview: Generate types from existing deployment
    console.log('⏭️  Skipping Convex deployment (preview build)');

    if (!convexUrl) {
      console.log('⚠️  Warning: NEXT_PUBLIC_CONVEX_URL not set, types may be missing');
    } else {
      console.log('📝 Generating Convex types from:', convexUrl);

      // Create a temporary convex.json to point to the existing deployment
      const convexConfigPath = path.join(process.cwd(), 'convex.json');
      const originalConfig = fs.existsSync(convexConfigPath)
        ? fs.readFileSync(convexConfigPath, 'utf8')
        : null;

      // Write config pointing to existing deployment
      fs.writeFileSync(convexConfigPath, JSON.stringify({
        functions: 'convex/',
      }, null, 2));

      try {
        // Generate types without deploying
        execSync('npx convex codegen --url ' + convexUrl, { stdio: 'inherit' });
        console.log('✅ Convex types generated');
      } finally {
        // Restore original config
        if (originalConfig) {
          fs.writeFileSync(convexConfigPath, originalConfig);
        }
      }
    }
  }

  // Always build Next.js
  console.log('📦 Building Next.js...');
  execSync('next build', { stdio: 'inherit' });
  console.log('✅ Next.js build completed');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
