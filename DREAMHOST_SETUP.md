# DreamHost Shared Hosting Setup Guide

## 🏠 **DreamHost Shared Hosting Configuration**

### **Prerequisites**

1. **SSH Access**: Enable SSH access in your DreamHost panel
2. **Node.js**: Ensure Node.js is installed on your account
3. **Domain**: Your domain should be properly configured

### **Step 1: SSH into Your DreamHost Account**

```bash
ssh YOUR_USERNAME@YOUR_DOMAIN.com
```

### **Step 2: Navigate to Your Project Directory**

```bash
cd ~/YOUR_DOMAIN/sundial-generator
```

### **Step 3: Run the Setup Script**

```bash
chmod +x scripts/dreamhost-setup.sh
./scripts/dreamhost-setup.sh
```

### **Step 4: Configure the Cron Script**

Edit the cron script to match your DreamHost path:

```bash
nano scripts/dreamhost-cron.sh
```

**Update this line with your actual path:**
```bash
PROJECT_DIR="/home/YOUR_USERNAME/YOUR_DOMAIN/sundial-generator"
```

**Example paths:**
- `/home/username/example.com/sundial-generator`
- `/home/username/mydomain.com/sundial-generator`

### **Step 5: Make the Cron Script Executable**

```bash
chmod +x scripts/dreamhost-cron.sh
```

### **Step 6: Test the Cron Script**

```bash
./scripts/dreamhost-cron.sh
```

You should see output like:
```
✅ Visitor data updated successfully at [timestamp]
```

### **Step 7: Set Up the Cron Job**

```bash
crontab -e
```

**Add this line to run every night at 2 AM:**
```bash
0 2 * * * /home/YOUR_USERNAME/YOUR_DOMAIN/sundial-generator/scripts/dreamhost-cron.sh
```

**Alternative times:**
- `0 1 * * *` - 1 AM
- `0 3 * * *` - 3 AM
- `0 4 * * *` - 4 AM

### **Step 8: Verify the Cron Job**

```bash
crontab -l
```

You should see your cron job listed.

### **Step 9: Check Logs**

The script creates logs at `logs/cron.log`. Check them:

```bash
tail -f logs/cron.log
```

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **"Permission denied"**
   ```bash
   chmod +x scripts/dreamhost-cron.sh
   ```

2. **"Node.js not found"**
   - Contact DreamHost support to enable Node.js
   - Or use the full path: `/usr/local/bin/node`

3. **"Path not found"**
   - Verify your project directory path
   - Use `pwd` to get the correct path

4. **"Log file not writable"**
   ```bash
   mkdir -p logs
   chmod 755 logs
   ```

### **Testing Commands:**

```bash
# Test Node.js
node --version

# Test npm
npm --version

# Test the update script
node scripts/updateVisitorData.js 7

# Check if visitor data was updated
ls -la public/visitor-data.json
```

## 📋 **DreamHost-Specific Notes**

- **Shared hosting limitations**: Limited CPU/memory
- **File permissions**: May need to adjust permissions
- **Path requirements**: Use absolute paths in cron jobs
- **Logging**: Always log to files for debugging
- **Time zones**: DreamHost servers are typically in PST/PDT

## 🔄 **Manual Updates**

If you need to update visitor data manually:

```bash
cd ~/YOUR_DOMAIN/sundial-generator
node scripts/updateVisitorData.js 7
```

## 📊 **Monitoring**

Check if the cron job is working:

```bash
# View recent logs
tail -20 logs/cron.log

# Check if visitor data was updated recently
ls -la public/visitor-data.json

# View the last update time
grep "updated successfully" logs/cron.log | tail -1
``` 