# DreamHost Quick Reference

## 🚀 **Quick Setup Commands**

### **1. SSH into DreamHost**
```bash
ssh YOUR_USERNAME@YOUR_DOMAIN.com
```

### **2. Navigate to Project**
```bash
cd ~/YOUR_DOMAIN/sundial-generator
```

### **3. Run Setup**
```bash
chmod +x scripts/dreamhost-setup.sh
./scripts/dreamhost-setup.sh
```

### **4. Edit Cron Script Path**
```bash
nano scripts/dreamhost-cron.sh
```
**Change line 7 to your actual path:**
```bash
PROJECT_DIR="/home/YOUR_USERNAME/YOUR_DOMAIN/sundial-generator"
```

### **5. Test Script**
```bash
chmod +x scripts/dreamhost-cron.sh
./scripts/dreamhost-cron.sh
```

### **6. Set Up Cron Job**
```bash
crontab -e
```
**Add this line:**
```bash
0 2 * * * /home/YOUR_USERNAME/YOUR_DOMAIN/sundial-generator/scripts/dreamhost-cron.sh
```

## 🔍 **Monitoring Commands**

### **Check if Cron Job is Set**
```bash
crontab -l
```

### **View Recent Logs**
```bash
tail -20 logs/cron.log
```

### **Check Last Update**
```bash
ls -la public/visitor-data.json
```

### **Manual Update**
```bash
node scripts/updateVisitorData.js 7
```

## ⚠️ **Common DreamHost Paths**

- **Username**: Your DreamHost username
- **Domain**: Your domain name (e.g., `example.com`)
- **Full Path**: `/home/username/example.com/sundial-generator`

## 🆘 **If Something Goes Wrong**

1. **Check logs**: `tail -f logs/cron.log`
2. **Test manually**: `./scripts/dreamhost-cron.sh`
3. **Check permissions**: `ls -la scripts/dreamhost-cron.sh`
4. **Verify path**: `pwd` and `ls -la` 