param(
    [switch]$SkipVisitorUpdate,
    [switch]$DryRun
)

Write-Host "Starting secure deployment process..." -ForegroundColor Green

if (!(Test-Path "package.json")) {
    Write-Host "Error: Must be run from project root directory" -ForegroundColor Red
    exit 1
}

if (Test-Path ".env.local") {
    Write-Host "Warning: .env.local file detected" -ForegroundColor Yellow
    Write-Host "Make sure this file is in .gitignore and not committed!" -ForegroundColor Yellow
}

if (!$SkipVisitorUpdate) {
    Write-Host "Updating visitor count..." -ForegroundColor Cyan
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would update visitor count" -ForegroundColor Gray
    } else {
        npm run update-visitor-count
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to update visitor count (SFTP credentials may be missing)" -ForegroundColor Yellow
            Write-Host "Continuing with deployment using existing visitor data..." -ForegroundColor Yellow
            Write-Host "To enable visitor updates, configure SFTP variables in .env.local" -ForegroundColor Yellow
        } else {
            Write-Host "Visitor count updated successfully" -ForegroundColor Green
        }
    }
} else {
    Write-Host "Skipping visitor count update" -ForegroundColor Yellow
}

Write-Host "Building project..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "[DRY RUN] Would run npm run build" -ForegroundColor Gray
} else {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "Build completed successfully" -ForegroundColor Green
}

Write-Host "Deploying to web server..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "[DRY RUN] Would run npm run deploy" -ForegroundColor Gray
} else {
    npm run deploy-sftp
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Deployment failed (SFTP credentials may be missing)" -ForegroundColor Yellow
        Write-Host "To enable deployment, configure SFTP variables in .env.local" -ForegroundColor Yellow
        Write-Host "Build completed successfully - you can manually deploy the 'dist' folder" -ForegroundColor Green
    } else {
        Write-Host "Deployment completed successfully" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Secure deployment completed successfully!" -ForegroundColor Green
Write-Host "Security reminders:" -ForegroundColor Yellow
Write-Host "- Ensure .env.local is in .gitignore" -ForegroundColor Yellow
Write-Host "- Never commit API keys to the repository" -ForegroundColor Yellow