# DreamHost Dist-Only Deployment Setup

## 🏠 **Dist-Only Deployment Configuration**

This setup is for when you only deploy the `dist` folder to DreamHost, not the entire project.

### **Prerequisites**

1. **Local Development Environment**: Your full project runs locally
2. **DreamHost SSH Access**: Enable SSH access in your DreamHost panel
3. **Deployment Method**: Choose how you deploy to DreamHost (rsync, scp, git, etc.)

## 🚀 **Option 1: Local Build + Deploy (Recommended)**

### **Step 1: Set Up Local Build Script**

Edit `scripts/build-and-deploy.sh` and customize the deployment command:

```bash
# Option A: Using rsync
rsync -avz --delete dist/ YOUR_USERNAME@YOUR_DOMAIN.com:~/YOUR_DOMAIN/

# Option B: Using scp
scp -r dist/* YOUR_USERNAME@YOUR_DOMAIN.com:~/YOUR_DOMAIN/

# Option C: Using git (if you have a deployment repo)
git add dist/
git commit -m "Deploy updated visitor data"
git push origin main
```

### **Step 2: Make Script Executable**

```bash
chmod +x scripts/build-and-deploy.sh
```

### **Step 3: Set Up Local Cron Job**

On your local machine (not DreamHost):

```bash
# Edit your local crontab
crontab -e

# Add this line to run every night at 2 AM
0 2 * * * /path/to/your/sundial-generator/scripts/build-and-deploy.sh
```

## 🚀 **Option 2: DreamHost-Only Updates**

### **Step 1: Deploy Minimal Scripts to DreamHost**

Copy these files to your DreamHost domain directory:
- `scripts/dreamhost-visitor-update.js`
- `scripts/dreamhost-dist-cron.sh`

### **Step 2: SSH into DreamHost**

```bash
ssh YOUR_USERNAME@YOUR_DOMAIN.com
```

### **Step 3: Navigate to Your Domain Directory**

```bash
cd ~/YOUR_DOMAIN
```

### **Step 4: Configure the Cron Script**

Edit the cron script to match your DreamHost path:

```bash
nano scripts/dreamhost-dist-cron.sh
```

**Update this line with your actual path:**
```bash
PROJECT_DIR="/home/YOUR_USERNAME/YOUR_DOMAIN"
```

### **Step 5: Make Scripts Executable**

```bash
chmod +x scripts/dreamhost-dist-cron.sh
```

### **Step 6: Test the Script**

```bash
./scripts/dreamhost-dist-cron.sh
```

### **Step 7: Set Up the Cron Job**

```bash
crontab -e
```

**Add this line to run every night at 2 AM:**
```bash
0 2 * * * /home/YOUR_USERNAME/YOUR_DOMAIN/scripts/dreamhost-dist-cron.sh
```

## 🚀 **Option 3: GitHub Actions (Easiest)**

### **Step 1: Set Up GitHub Actions**

The `.github/workflows/nightly-visitor-update.yml` file will:
1. Update visitor data
2. Build the project
3. Commit and push changes
4. You can then pull the changes to DreamHost

### **Step 2: Set Up DreamHost to Pull Changes**

On DreamHost, set up a script to pull the latest changes:

```bash
#!/bin/bash
cd ~/YOUR_DOMAIN
git pull origin main
```

## 📋 **Recommended Approach**

### **For Your Setup, I Recommend Option 1:**

1. **Local Build + Deploy**: Run everything locally, deploy only `dist`
2. **Local Cron Job**: Schedule builds on your local machine
3. **Simple Deployment**: Use rsync or scp to deploy

### **Why This Works Best:**

- ✅ **Full Control**: You have access to all project files locally
- ✅ **No DreamHost Limitations**: No Node.js dependencies on DreamHost
- ✅ **Simple**: Just deploy the built files
- ✅ **Reliable**: Local environment is more stable

## 🔧 **Customization**

### **For rsync Deployment:**

```bash
# In scripts/build-and-deploy.sh, uncomment and customize:
rsync -avz --delete dist/ YOUR_USERNAME@YOUR_DOMAIN.com:~/YOUR_DOMAIN/
```

### **For scp Deployment:**

```bash
# In scripts/build-and-deploy.sh, uncomment and customize:
scp -r dist/* YOUR_USERNAME@YOUR_DOMAIN.com:~/YOUR_DOMAIN/
```

## 📊 **Monitoring**

### **Check Local Build Logs:**

```bash
# View recent logs
tail -20 logs/build.log

# Check if deployment was successful
ls -la dist/
```

### **Check DreamHost Deployment:**

```bash
# SSH into DreamHost
ssh YOUR_USERNAME@YOUR_DOMAIN.com

# Check if files were updated
ls -la ~/YOUR_DOMAIN/visitor-data.json
```

## 🆘 **Troubleshooting**

### **Common Issues:**

1. **"Permission denied" on DreamHost**
   ```bash
   chmod 755 ~/YOUR_DOMAIN
   chmod 644 ~/YOUR_DOMAIN/*
   ```

2. **"rsync not found"**
   - Install rsync on your local machine
   - Or use scp instead

3. **"SSH key not set up"**
   ```bash
   ssh-copy-id YOUR_USERNAME@YOUR_DOMAIN.com
   ```

4. **"Build fails locally"**
   ```bash
   npm install
   npm run build
   ``` 