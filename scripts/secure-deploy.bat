@echo off
REM Secure Deployment Script (Batch version)
REM This script updates visitor count and deploys without exposing sensitive data

echo 🚀 Starting secure deployment process...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Must be run from project root directory
    exit /b 1
)

REM Check if .env.local exists and warn about security
if exist ".env.local" (
    echo ⚠️  Warning: .env.local file detected
    echo    Make sure this file is in .gitignore and not committed!
)

REM Update visitor count
echo 📊 Updating visitor count...
call npm run update-visitor-count
if %errorlevel% neq 0 (
    echo ❌ Failed to update visitor count
    exit /b 1
)
echo ✅ Visitor count updated successfully

REM Build the project
echo 🔨 Building project...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    exit /b 1
)
echo ✅ Build completed successfully

REM Deploy to GitHub Pages
echo 🌐 Deploying to GitHub Pages...
call npm run deploy
if %errorlevel% neq 0 (
    echo ❌ Deployment failed
    exit /b 1
)
echo ✅ Deployment completed successfully

echo.
echo 🎉 Secure deployment completed successfully!
echo    Your site should be updated at: https://yourusername.github.io/sundial-generator
echo.
echo 💡 Security reminders:
echo    • Ensure .env.local is in .gitignore
echo    • Never commit API keys to the repository
echo    • Consider using GitHub Secrets for CI/CD

pause