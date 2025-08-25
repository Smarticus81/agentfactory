@echo off
echo Setting up git repository for Voice Agent Studio...

REM Initialize git repository
git init

REM Add all files
git add .

REM Create initial commit
git commit -m "Initial commit: Voice Agent Studio with multi-provider support, RAG, and PWA features"

REM Add remote origin
git remote add origin https://github.com/Smarticus81/Venuevoice4.git

REM Push to remote repository
git push -u origin main

echo Git repository setup complete!
pause
