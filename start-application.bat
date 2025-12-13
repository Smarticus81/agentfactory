@echo off
setlocal

REM Change to repository root
cd /d "%~dp0"

REM Install dependencies if node_modules missing
if not exist "node_modules" (
  echo Installing dependencies with pnpm...
  pnpm install || goto :end
)

REM Ensure local environment file exists
if not exist ".env.local" (
  if exist ".env.example" (
    echo Bootstrapping .env.local from .env.example...
    copy ".env.example" ".env.local" >nul
    echo Update .env.local with your credentials before continuing.
  ) else (
    echo WARNING: .env.local not found and .env.example missing. Create .env.local prior to running the app.
  )
)

REM Launch Convex dev server in separate window
echo Launching Convex dev server...
start "Convex Dev" cmd /k "cd /d ""%~dp0"" && pnpm convex:dev"

REM Launch Next.js dev server in current window
echo Launching Next.js dev server...
pnpm dev

:end
endlocal

