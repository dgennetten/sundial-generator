param(
    [switch]$DryRun
)

Write-Host "Starting secure build and deploy process..." -ForegroundColor Green

if (!(Test-Path "package.json")) {
    Write-Host "Error: Must be run from project root directory" -ForegroundColor Red
    exit 1
}

# Security check: warn if .env.local exists (good for security, but remind about gitignore)
if (Test-Path ".env.local") {
    Write-Host "[OK] .env.local file detected (credentials will be loaded securely)" -ForegroundColor Green
} else {
    Write-Host "[WARNING] .env.local file not found" -ForegroundColor Yellow
    Write-Host "   Create .env.local with your SFTP credentials:" -ForegroundColor Yellow
    Write-Host "     SFTP_HOST=your-sftp-host" -ForegroundColor Gray
    Write-Host "     SFTP_USERNAME=your-username" -ForegroundColor Gray
    Write-Host "     SFTP_PASSWORD=your-password" -ForegroundColor Gray
    Write-Host "     FTP_REMOTE_PATH=/path/to/your/site" -ForegroundColor Gray
}

# Verify .env.local is in .gitignore
$gitignoreContent = ""
if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content ".gitignore" -Raw
}
if ($gitignoreContent -notmatch "\.env\.local") {
    Write-Host "[WARNING] .env.local is NOT in .gitignore!" -ForegroundColor Red
    Write-Host "   Please add .env.local to .gitignore before proceeding" -ForegroundColor Red
    Write-Host "   Press Ctrl+C to cancel, or Enter to continue anyway..." -ForegroundColor Yellow
    Read-Host
}

# Build the project
Write-Host ""
Write-Host "Building project..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "[DRY RUN] Would run: npm run build" -ForegroundColor Gray
} else {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Build completed successfully" -ForegroundColor Green
}

# Deploy to web server via SFTP
Write-Host ""
Write-Host "Deploying to web server via SFTP..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "[DRY RUN] Would run: npm run deploy-sftp" -ForegroundColor Gray
    Write-Host "[DRY RUN] SFTP credentials would be loaded from .env.local" -ForegroundColor Gray
} else {
    npm run deploy-sftp
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Deployment failed" -ForegroundColor Red
        Write-Host "   Common issues:" -ForegroundColor Yellow
        Write-Host "   - Missing SFTP credentials in .env.local" -ForegroundColor Yellow
        Write-Host "   - Incorrect SFTP credentials" -ForegroundColor Yellow
        Write-Host "   - Network connectivity issues" -ForegroundColor Yellow
        Write-Host "   - Build artifacts in 'dist' folder" -ForegroundColor Green
        exit 1
    }
    Write-Host "[OK] Deployment completed successfully" -ForegroundColor Green
}

Write-Host ""
Write-Host "Build and deploy completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Security reminders:" -ForegroundColor Yellow
Write-Host "   - Ensure .env.local is in .gitignore (verified above)" -ForegroundColor Yellow
Write-Host "   - Never commit credentials to the repository" -ForegroundColor Yellow
Write-Host "   - Keep .env.local file secure and private" -ForegroundColor Yellow

