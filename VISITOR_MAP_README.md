# Visitor Map Feature

This feature adds a world map card to your sundial generator that shows visitor locations and statistics based on your Dreamhost access logs.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install ssh2
```

### 2. Fetch and Process Visitor Data

The system includes scripts to automatically fetch your Dreamhost access logs and process them into visitor data:

```bash
# Fetch logs from the last 30 days (default)
npm run fetch-logs

# Fetch logs from the last 7 days
npm run fetch-logs-7d

# Fetch logs from the last 30 days (explicit)
npm run fetch-logs-30d
```

### 3. Manual Log Processing (Alternative)

If you prefer to download logs manually, you can use the log parser directly:

```bash
# Download your access log from Dreamhost SFTP to ./logs/ directory
# Then run:
node src/utils/logParser.js ./logs/access.log ./public/visitor-data.json 30
```

## How It Works

### Backend Processing

1. **Log Fetching**: The `scripts/fetchLogs.js` script connects to your Dreamhost server via SFTP and downloads the latest access log files.

2. **Log Parsing**: The script parses Apache/Nginx log format to extract:
   - IP addresses
   - Timestamps
   - Request paths
   - User agents

3. **Geolocation**: Uses the free ip-api.com service to convert IP addresses to geographic locations (country, region, city, coordinates).

4. **Data Processing**: 
   - Filters out bot traffic and static file requests
   - Deduplicates visitors by IP address
   - Counts visits per location
   - Filters by date range (configurable)

5. **Output**: Saves processed data to `./public/visitor-data.json` for the React app to consume.

### Frontend Display

The `VisitorMap` React component displays:

- **Summary Statistics**: Total unique visitors, total visits, and date range
- **World Map View**: Visual representation of visitor locations with visit counts
- **Country Statistics**: Top countries by visitor count
- **Interactive Details**: Click on countries to see city-level details

## Features

### Visitor Statistics
- Unique visitor count
- Total visit count
- Visits since date (based on oldest log entry)

### Geographic Visualization
- Country flags and names
- City-level location data
- Visit counts per location
- Interactive country selection

### Data Privacy
- Only processes publicly available access log data
- IP addresses are used only for geolocation and not stored in the final output
- Respects rate limits of the geolocation service

## Configuration

### SFTP Settings
The SFTP configuration is in `scripts/fetchLogs.js`:

```javascript
const SFTP_CONFIG = {
  host: process.env.SFTP_HOST || 'your-host.com',
  username: process.env.SFTP_USERNAME || 'your-username',
  password: process.env.SFTP_PASSWORD, // NEVER hardcode passwords!
  port: parseInt(process.env.SFTP_PORT) || 22
};

const LOG_PATH = process.env.SFTP_LOG_PATH || '/path/to/your/logs/';
```

### Security Recommendations
1. **Use SSH Keys**: Replace password authentication with SSH key authentication
2. **Environment Variables**: Store credentials in environment variables instead of hardcoding
3. **Access Restrictions**: Ensure your SFTP user has minimal required permissions

### Rate Limiting
The geolocation service (ip-api.com) has rate limits:
- Free tier: 45 requests per minute
- The script includes automatic delays to respect these limits

## Troubleshooting

### Common Issues

1. **SFTP Connection Failed**
   - Verify your Dreamhost credentials
   - Check if SFTP is enabled for your account
   - Ensure the log path is correct

2. **No Visitor Data**
   - Check if the access log file exists and has recent entries
   - Verify the log format matches the parser regex
   - Ensure the date range includes recent visits

3. **Geolocation Errors**
   - The free ip-api.com service may have rate limits or downtime
   - Private/local IP addresses are automatically skipped
   - Some IP addresses may not have location data available

4. **React Component Not Loading**
   - Ensure `visitor-data.json` exists in the `public` directory
   - Check browser console for any JavaScript errors
   - Verify the component is properly imported in App.tsx

### Manual Testing

You can test with sample data by creating a `public/visitor-data.json` file:

```json
{
  "visitors": [
    {
      "country": "United States",
      "countryCode": "US",
      "region": "Colorado",
      "city": "Fort Collins",
      "lat": 40.5853,
      "lon": -105.0844,
      "timezone": "America/Denver",
      "firstVisit": "2024-01-15T10:30:00Z",
      "lastVisit": "2024-01-20T14:22:00Z",
      "visitCount": 15
    }
  ],
  "totalVisitors": 1,
  "totalVisits": 15,
  "processedDate": "2024-01-20T15:00:00Z"
}
```

## Future Enhancements

Potential improvements you could add:

1. **Real-time Updates**: Set up a cron job to automatically update visitor data
2. **Enhanced Mapping**: Integrate with Google Maps or Leaflet for better visualization
3. **Analytics Dashboard**: Add more detailed analytics and trends
4. **Visitor Tracking**: Implement client-side tracking for real-time data
5. **Performance Optimization**: Cache geolocation results to reduce API calls

## Support

If you encounter issues:

1. Check the console output for error messages
2. Verify your Dreamhost account settings and permissions
3. Test with a smaller date range to reduce processing time
4. Consider using the manual log processing method for debugging