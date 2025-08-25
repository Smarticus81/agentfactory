const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning up project structure...');

// Files and directories to remove
const filesToRemove = [
  'convex/vercelDeploy.ts',
  'convex/vercelDeploy.ts.bak', 
  'convex/vercelDeploy.ts.disabled',
  'deploy.bat',
  'deploy.sh',
  'DEPLOYMENT.md',
  'QUICK_DEPLOY.md',
  '.pytest_cache',
  'tsconfig.tsbuildinfo'
];

// Remove unnecessary files
filesToRemove.forEach(file => {
  const filePath = path.join(__dirname, file);
  try {
    if (fs.existsSync(filePath)) {
      if (fs.lstatSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`✅ Removed directory: ${file}`);
      } else {
        fs.unlinkSync(filePath);
        console.log(`✅ Removed file: ${file}`);
      }
    }
  } catch (error) {
    console.log(`⚠️  Could not remove ${file}: ${error.message}`);
  }
});

// Create docs directory for RAG functionality
const docsDir = path.join(__dirname, 'public', 'docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
  console.log('✅ Created docs directory for RAG uploads');
}

// Create uploads directory
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

// Update .gitignore to include upload directories
const gitignorePath = path.join(__dirname, '.gitignore');
let gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

const additionalIgnores = `
# Upload directories
/public/uploads/*
!/public/uploads/.gitkeep
/public/docs/*
!/public/docs/.gitkeep

# Build artifacts
*.tsbuildinfo
.next/
dist/
build/

# Environment files
.env.local
.env.production
`;

if (!gitignoreContent.includes('# Upload directories')) {
  fs.writeFileSync(gitignorePath, gitignoreContent + additionalIgnores);
  console.log('✅ Updated .gitignore');
}

// Create .gitkeep files
fs.writeFileSync(path.join(docsDir, '.gitkeep'), '');
fs.writeFileSync(path.join(uploadsDir, '.gitkeep'), '');

console.log('🎉 Project cleanup completed!');
