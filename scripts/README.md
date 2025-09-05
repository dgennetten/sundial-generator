# Deployment Scripts

This directory contains secure deployment scripts that handle visitor count updates and deployment without compromising security.

## 🔐 Security Features

- **API Key Protection**: Never commits `.env.local` to the repository
- **Gitignore Verification**: Warns if sensitive files might be exposed
- **Dry Run Mode**: Test deployment process without making changes
- **Error Handling**: Stops deployment if any step fails

## 📋 Available Scripts

### PowerShell Script (Recommended)
```bash
# Full deployment with visitor count update
npm run secure-deploy

# Dry run (test without making changes)
npm run secure-deploy-dry

# Direct PowerShell execution
powershell -ExecutionPolicy Bypass -File scripts/secure-deploy.ps1
```

### Batch Script (Alternative)
```bash
# Run from project root
scripts\secure-deploy.bat
```

## 🚀 What the Scripts Do

1. **Security Check**: Verifies `.env.local` is properly ignored
2. **Update Visitor Count**: Fetches latest analytics data (7 days)
3. **Build Project**: Compiles TypeScript and builds for production
4. **Deploy**: Pushes to GitHub Pages

## ⚙️ Script Options

### PowerShell Script Options
- `-SkipVisitorUpdate`: Skip the visitor count update step
- `-DryRun`: Show what would be done without executing

### Examples
```bash
# Skip visitor update
powershell -ExecutionPolicy Bypass -File scripts/secure-deploy.ps1 -SkipVisitorUpdate

# Dry run to test
powershell -ExecutionPolicy Bypass -File scripts/secure-deploy.ps1 -DryRun
```

## 🔧 Prerequisites

1. **Environment File**: Create `.env.local` with your Google Maps API key:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

2. **NPM Scripts**: Ensure these scripts exist in `package.json`:
   - `update-visitor-count`
   - `build`
   - `deploy`

3. **Git Configuration**: Make sure you can push to the `gh-pages` branch

## 🛡️ Security Best Practices

- ✅ `.env.local` is in `.gitignore`
- ✅ Never commit API keys to the repository
- ✅ Use GitHub Secrets for CI/CD in production
- ✅ Regularly rotate API keys
- ✅ Monitor API usage and quotas

## 🐛 Troubleshooting

### Common Issues

1. **PowerShell Execution Policy**:
   ```bash
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Missing API Key**:
   - Check `.env.local` exists and has correct format
   - Verify API key is valid and has correct permissions

3. **Build Failures**:
   - Run `npm install` to ensure dependencies are installed
   - Check TypeScript compilation with `npx tsc --noEmit`

4. **Deployment Failures**:
   - Verify GitHub Pages is enabled for your repository
   - Check you have push permissions to the repository
   - Ensure `gh-pages` branch exists or can be created

## 📞 Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify all prerequisites are met
3. Try running individual npm scripts to isolate the problem
4. Use dry run mode to test without making changes