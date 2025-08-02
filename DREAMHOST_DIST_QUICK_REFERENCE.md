# DreamHost Dist-Only Quick Reference

## 🚀 **Recommended Setup: Local Build + Deploy**

### **1. Customize Build Script**
```bash
# Edit scripts/build-and-deploy.sh
# Uncomment and customize the deployment command:
rsync -avz --delete dist/ YOUR_USERNAME@YOUR_DOMAIN.com:~/YOUR_DOMAIN/
```

### **2. Test Local Build**
```bash
chmod +x scripts/build-and-deploy.sh
./scripts/build-and-deploy.sh
```

### **3. Set Up Local Cron Job**
```bash
# Edit your local crontab
crontab -e

# Add this line (adjust path to your project):
0 2 * * * /path/to/your/sundial-generator/scripts/build-and-deploy.sh
```

## 🔍 **Alternative: GitHub Actions**

### **1. Enable GitHub Actions**
The `.github/workflows/nightly-visitor-update.yml` will:
- Update visitor data
- Build project
- Commit changes
- Push to repository

### **2. Set Up DreamHost Pull**
```bash
# On DreamHost, create a pull script:
#!/bin/bash
cd ~/YOUR_DOMAIN
git pull origin main

# Make it executable:
chmod +x pull-updates.sh

# Add to crontab:
0 3 * * * /home/YOUR_USERNAME/YOUR_DOMAIN/pull-updates.sh
```

## 📊 **Monitoring Commands**

### **Check Local Build**
```bash
# View build logs
tail -20 logs/build.log

# Check dist folder
ls -la dist/
```

### **Check DreamHost Deployment**
```bash
# SSH into DreamHost
ssh YOUR_USERNAME@YOUR_DOMAIN.com

# Check if files were updated
ls -la ~/YOUR_DOMAIN/visitor-data.json
```

## ⚠️ **Key Differences from Full Project**

- **Local Processing**: All Node.js work happens locally
- **Dist-Only Deploy**: Only built files go to DreamHost
- **Local Cron**: Cron job runs on your local machine
- **Simple Deployment**: Just copy files, no build on DreamHost

## 🆘 **Common Issues**

1. **"SSH key not set up"**
   ```bash
   ssh-copy-id YOUR_USERNAME@YOUR_DOMAIN.com
   ```

2. **"rsync not found"**
   - Install rsync: `brew install rsync` (Mac) or `apt install rsync` (Linux)
   - Or use scp instead

3. **"Permission denied"**
   ```bash
   chmod 755 ~/YOUR_DOMAIN
   chmod 644 ~/YOUR_DOMAIN/*
   ```

## 📋 **File Structure**

```
Local Machine:
├── src/                    # Source code
├── scripts/               # Build scripts
├── dist/                  # Built files (deployed)
└── package.json           # Dependencies

DreamHost:
└── YOUR_DOMAIN/          # Only dist contents
    ├── index.html
    ├── visitor-data.json
    └── assets/
``` 