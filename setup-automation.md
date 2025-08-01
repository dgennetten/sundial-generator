# Visitor Map Automation Setup Guide

## Option 1: Dreamhost Cron Jobs (Recommended)

### Step 1: Set up the cron script
The `scripts/cronUpdate.js` file has been created for automated updates.

### Step 2: Configure Dreamhost Cron Job
1. Log into your Dreamhost panel
2. Go to **Goodies > Cron Jobs**
3. Click **Add a New Cron Job**
4. Configure as follows:
   - **User**: Your domain user (dgennetten@gennetten.org)
   - **Title**: Sundial Visitor Map Update
   - **Email output to**: Your email address
   - **Command**: 
     ```bash
     cd /home/dgennetten/sundial.gennetten.org && /usr/bin/node scripts/cronUpdate.js
     ```
   - **Use locking**: Yes (prevents overlapping runs)
   - **When to run**: Choose your preferred schedule:
     - **Daily at 2 AM**: `0 2 * * *`
     - **Every 6 hours**: `0 */6 * * *`
     - **Weekly on Sunday at 1 AM**: `0 1 * * 0`

### Step 3: Test the cron script manually
```bash
# SSH into your Dreamhost server and run:
cd /home/dgennetten/sundial.gennetten.org
node scripts/cronUpdate.js
```

## Option 2: GitHub Actions (Alternative)

If you prefer CI/CD automation, you can use GitHub Actions:

### Step 1: Add secrets to your GitHub repository
- `DREAMHOST_FTP_PASSWORD`: Your FTP password
- `DREAMHOST_SFTP_PASSWORD`: Your SFTP password (for log access)

### Step 2: Create workflow file
Create `.github/workflows/update-visitor-map.yml`:

```yaml
name: Update Visitor Map

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual triggering

jobs:
  update-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Update visitor data
      env:
        SFTP_PASSWORD: ${{ secrets.DREAMHOST_SFTP_PASSWORD }}
      run: npm run update-visitors
    
    - name: Build project
      run: npm run build
    
    - name: Deploy to Dreamhost
      env:
        FTP_PASSWORD: ${{ secrets.DREAMHOST_FTP_PASSWORD }}
      run: node deploy.js
```

## Option 3: Local Automation with Task Scheduler (Windows)

If you prefer to run automation from your local machine:

### Step 1: Create batch file
Create `update-visitor-map.bat`:

```batch
@echo off
cd /d "C:\Users\dougl\GIT\sundial-generator"
echo Starting visitor map update...
npm run update-and-deploy
echo Update completed at %date% %time%
pause
```

### Step 2: Set up Windows Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (daily, weekly, etc.)
4. Set action to run your batch file

## Option 4: Webhook-Based Updates

For real-time updates, you could create a webhook endpoint:

### Step 1: Create webhook script
```javascript
// webhook-update.js - Place this on your Dreamhost server
const http = require('http');
const { execSync } = require('child_process');

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/update-visitor-map') {
    try {
      console.log('Webhook triggered - updating visitor map...');
      execSync('cd /home/dgennetten/sundial.gennetten.org && node scripts/cronUpdate.js');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Update triggered successfully');
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Update failed: ' + error.message);
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(3001, () => {
  console.log('Webhook server running on port 3001');
});
```

## Recommended Setup

For your Dreamhost shared hosting, I recommend **Option 1 (Cron Jobs)** because:

1. ✅ **Native support**: Dreamhost fully supports cron jobs
2. ✅ **Reliable**: Runs on the server, not dependent on external services
3. ✅ **Simple**: Easy to set up and maintain
4. ✅ **Cost-effective**: No additional services required
5. ✅ **Flexible scheduling**: Choose update frequency that suits your needs

## Security Improvements

Before setting up automation, consider these security enhancements:

### 1. Use environment variables for credentials
Create `.env` file (already supported by your scripts):
```env
FTP_PASSWORD=your_ftp_password
SFTP_PASSWORD=your_sftp_password
```

### 2. Use SSH keys instead of passwords
Generate SSH key pair and add public key to Dreamhost for passwordless authentication.

### 3. Restrict file permissions
```bash
chmod 600 .env
chmod 700 scripts/
```

## Monitoring and Notifications

### Email notifications
Your cron job will automatically email you the output. For custom notifications:

```javascript
// Add to cronUpdate.js
import nodemailer from 'nodemailer';

async function sendNotification(subject, message) {
  // Configure with your email settings
  const transporter = nodemailer.createTransporter({
    // Your email configuration
  });
  
  await transporter.sendMail({
    from: 'sundial@gennetten.org',
    to: 'your-email@example.com',
    subject: subject,
    text: message
  });
}
```

## Testing Your Automation

1. **Test the script manually first**:
   ```bash
   node scripts/cronUpdate.js
   ```

2. **Check the logs**: Cron job output will be emailed to you

3. **Verify the website**: Check that your visitor map updates correctly

4. **Monitor for a few days**: Ensure the automation runs reliably

## Troubleshooting

### Common issues:
- **Path problems**: Ensure cron job runs from correct directory
- **Node.js version**: Verify Node.js is available in cron environment
- **Permissions**: Check file permissions for scripts and data files
- **Network issues**: SFTP/FTP connections may occasionally fail

### Debug commands:
```bash
# Test SFTP connection
npm run test-connection

# Test log processing
npm run debug-logs

# Verify credentials
npm run verify-credentials
```

Your visitor map automation is now ready! Choose the option that best fits your workflow and technical preferences.
