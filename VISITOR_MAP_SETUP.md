# Visitor Map - Quick Setup Guide

## ✅ What's Already Done

Your sundial generator now includes a **Visitor Map card** that shows:
- 🌍 World map with visitor locations
- 📊 Visitor statistics (unique visitors, total visits)
- 🏳️ Country breakdown with flags
- 📅 "Visits since" date tracking
- 🖱️ Interactive country selection

## 🚀 How to Use

### 1. View the Visitor Map (Already Working!)
Your React app is running at http://localhost:5173 and already shows sample visitor data. The Visitor Map card appears in the left panel after the Design Export section.

### 2. Update with Real Data
To fetch and process your actual Dreamhost access logs:

```bash
# Get visitor data from last 30 days (default)
npm run update-visitors

# Get visitor data from last 7 days
npm run update-visitors-7d

# Update data and build for production
npm run update-and-build

# Update, build, and deploy (if you have deploy.js)
npm run update-and-deploy
```

### 3. Manual Log Processing (Alternative)
If you prefer to download logs manually:

```bash
# Just fetch logs without processing
npm run fetch-logs

# Process a specific log file
node src/utils/logParser.js ./logs/access.log ./public/visitor-data.json 30
```

## 📁 Files Created

### React Components
- `src/components/VisitorMap.tsx` - Main visitor map card component

### Backend Scripts
- `scripts/fetchLogs.js` - Downloads logs from Dreamhost via SFTP
- `scripts/updateVisitorData.js` - Complete update workflow
- `scripts/testLogParser.js` - Test script for development
- `src/utils/logParser.js` - Log parsing utilities

### Data Files
- `public/visitor-data.json` - Processed visitor data (sample data included)
- `logs/` - Directory for downloaded log files

### Documentation
- `VISITOR_MAP_README.md` - Detailed technical documentation
- `VISITOR_MAP_SETUP.md` - This quick setup guide

## 🔧 Configuration

Your SFTP settings are already configured in `scripts/fetchLogs.js`:
- Host: gennetten.org
- Username: dgennetten@gennetten.org
- Log path: /home/_domain_logs/dgennetten/sundial.gennetten.org/https.54243421/

## 🎯 Features

### Current Features
- ✅ Automatic log downloading from Dreamhost
- ✅ IP geolocation using free ip-api.com service
- ✅ Visitor deduplication by IP address
- ✅ Visit counting per location
- ✅ Country-level statistics with flags
- ✅ Interactive map visualization
- ✅ Date range filtering
- ✅ Sample data for immediate testing

### Smart Filtering
- Skips bot traffic and static file requests (.css, .js, images)
- Filters out private/local IP addresses
- Respects geolocation API rate limits
- Configurable date ranges

## 🚨 Important Notes

### Security
- Your SFTP credentials are currently hardcoded in the script
- Consider using environment variables or SSH keys for production
- The geolocation service is free but has rate limits (45 requests/minute)

### Rate Limits
- The script includes automatic delays to respect API limits
- Processing large log files may take time
- Consider running updates during off-peak hours

### Data Privacy
- IP addresses are used only for geolocation and not stored in the final output
- Only publicly available access log data is processed
- No personal information is collected or stored

## 🔄 Automation Ideas

### Scheduled Updates
You could set up automatic updates using:

1. **Windows Task Scheduler** (for your local development)
2. **Cron job** (if you have server access)
3. **GitHub Actions** (for automated deployment)

Example cron job (runs daily at 2 AM):
```bash
0 2 * * * cd /path/to/sundial-generator && npm run update-and-deploy
```

## 🐛 Troubleshooting

### Common Issues
1. **SFTP Connection Failed**: Check your Dreamhost credentials and network connection
2. **No Visitor Data**: Verify the log path and ensure recent traffic exists
3. **Geolocation Errors**: The free API may have rate limits or temporary outages
4. **React Component Not Loading**: Ensure `visitor-data.json` exists in the `public` directory

### Testing
```bash
# Test log parsing functionality
node scripts/testLogParser.js

# Test with sample data (already included)
# Just run your React app - it will show sample data if real data isn't available
```

## 📈 Next Steps

1. **Try it now**: Your visitor map is already working with sample data
2. **Get real data**: Run `npm run update-visitors` to fetch your actual logs
3. **Customize**: Modify the VisitorMap component to match your design preferences
4. **Automate**: Set up scheduled updates for fresh data
5. **Enhance**: Consider adding more detailed analytics or better map visualization

## 🎉 You're All Set!

Your sundial generator now has a beautiful visitor map that shows where your users are coming from around the world. The sample data is already loaded, so you can see it working immediately at http://localhost:5173!