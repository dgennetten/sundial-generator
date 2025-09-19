// Local GeoIP resolver - fast and API-free
import fs from 'fs';
import path from 'path';

// Simple IP to integer conversion for faster lookups
function ipToInt(ip) {
  if (!ip || typeof ip !== 'string') return 0;
  
  // Handle IPv6 by skipping for now (could be enhanced later)
  if (ip.includes(':')) return 0;
  
  const parts = ip.split('.');
  if (parts.length !== 4) return 0;
  
  return parseInt(parts[0]) * 16777216 + 
         parseInt(parts[1]) * 65536 + 
         parseInt(parts[2]) * 256 + 
         parseInt(parts[3]);
}

// Major IP ranges and their locations (simplified but covers most common cases)
const IP_RANGES = [
  // US Major Cloud Providers
  { start: ipToInt('52.0.0.0'), end: ipToInt('52.255.255.255'), country: 'United States', countryCode: 'US', region: 'Virginia', city: 'Ashburn', lat: 39.0438, lon: -77.4874 },
  { start: ipToInt('54.0.0.0'), end: ipToInt('54.255.255.255'), country: 'United States', countryCode: 'US', region: 'Virginia', city: 'Ashburn', lat: 39.0438, lon: -77.4874 },
  { start: ipToInt('34.0.0.0'), end: ipToInt('34.255.255.255'), country: 'United States', countryCode: 'US', region: 'Oregon', city: 'The Dalles', lat: 45.5945, lon: -121.1786 },
  { start: ipToInt('35.0.0.0'), end: ipToInt('35.255.255.255'), country: 'United States', countryCode: 'US', region: 'Oregon', city: 'The Dalles', lat: 45.5945, lon: -121.1786 },
  { start: ipToInt('40.0.0.0'), end: ipToInt('40.255.255.255'), country: 'United States', countryCode: 'US', region: 'Virginia', city: 'Boydton', lat: 36.6777, lon: -78.3747 },
  { start: ipToInt('65.0.0.0'), end: ipToInt('65.255.255.255'), country: 'United States', countryCode: 'US', region: 'Washington', city: 'Quincy', lat: 47.233, lon: -119.852 },
  { start: ipToInt('66.249.64.0'), end: ipToInt('66.249.95.255'), country: 'United States', countryCode: 'US', region: 'California', city: 'Mountain View', lat: 37.4056, lon: -122.0775 },
  
  // Europe
  { start: ipToInt('5.39.0.0'), end: ipToInt('5.39.255.255'), country: 'France', countryCode: 'FR', region: 'Hauts-de-France', city: 'Roubaix', lat: 50.6927, lon: 3.17785 },
  { start: ipToInt('51.68.0.0'), end: ipToInt('51.68.255.255'), country: 'France', countryCode: 'FR', region: 'Hauts-de-France', city: 'Roubaix', lat: 50.6927, lon: 3.17785 },
  { start: ipToInt('91.231.0.0'), end: ipToInt('91.231.255.255'), country: 'France', countryCode: 'FR', region: 'Hauts-de-France', city: 'Gravelines', lat: 50.9855, lon: 2.1322 },
  { start: ipToInt('138.68.0.0'), end: ipToInt('138.68.255.255'), country: 'Germany', countryCode: 'DE', region: 'Hesse', city: 'Frankfurt am Main', lat: 50.1169, lon: 8.6837 },
  { start: ipToInt('185.250.0.0'), end: ipToInt('185.250.255.255'), country: 'Czechia', countryCode: 'CZ', region: 'Prague', city: 'Prague', lat: 50.0883, lon: 14.4124 },
  
  // Canada
  { start: ipToInt('54.39.0.0'), end: ipToInt('54.39.255.255'), country: 'Canada', countryCode: 'CA', region: 'Quebec', city: 'Beauharnois', lat: 45.3161, lon: -73.8736 },
  { start: ipToInt('143.198.0.0'), end: ipToInt('143.198.255.255'), country: 'Canada', countryCode: 'CA', region: 'Ontario', city: 'Toronto', lat: 43.6547, lon: -79.3623 },
  
  // Asia
  { start: ipToInt('27.115.0.0'), end: ipToInt('27.115.255.255'), country: 'China', countryCode: 'CN', region: 'Shanghai', city: 'Shanghai', lat: 31.2222, lon: 121.4581 },
  { start: ipToInt('119.28.0.0'), end: ipToInt('119.28.255.255'), country: 'Singapore', countryCode: 'SG', region: 'North West', city: 'Singapore', lat: 1.352, lon: 103.8198 },
  { start: ipToInt('157.119.0.0'), end: ipToInt('157.119.255.255'), country: 'India', countryCode: 'IN', region: 'Maharashtra', city: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  
  // Additional common ranges
  { start: ipToInt('172.0.0.0'), end: ipToInt('172.255.255.255'), country: 'United States', countryCode: 'US', region: 'Texas', city: 'Houston', lat: 29.7604, lon: -95.3698 },
];

// Country-based fallback locations for better coverage
export const COUNTRY_LOCATIONS = {
  'US': { country: 'United States', countryCode: 'US', region: 'Colorado', city: 'Denver', lat: 39.7392, lon: -104.9903 },
  'CA': { country: 'Canada', countryCode: 'CA', region: 'Ontario', city: 'Toronto', lat: 43.6532, lon: -79.3832 },
  'GB': { country: 'United Kingdom', countryCode: 'GB', region: 'England', city: 'London', lat: 51.5074, lon: -0.1278 },
  'FR': { country: 'France', countryCode: 'FR', region: 'Île-de-France', city: 'Paris', lat: 48.8566, lon: 2.3522 },
  'DE': { country: 'Germany', countryCode: 'DE', region: 'Berlin', city: 'Berlin', lat: 52.5200, lon: 13.4050 },
  'JP': { country: 'Japan', countryCode: 'JP', region: 'Tokyo', city: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  'CN': { country: 'China', countryCode: 'CN', region: 'Beijing', city: 'Beijing', lat: 39.9042, lon: 116.4074 },
  'IN': { country: 'India', countryCode: 'IN', region: 'Delhi', city: 'New Delhi', lat: 28.6139, lon: 77.2090 },
  'AU': { country: 'Australia', countryCode: 'AU', region: 'New South Wales', city: 'Sydney', lat: -33.8688, lon: 151.2093 },
  'BR': { country: 'Brazil', countryCode: 'BR', region: 'São Paulo', city: 'São Paulo', lat: -23.5505, lon: -46.6333 },
  'RU': { country: 'Russia', countryCode: 'RU', region: 'Moscow', city: 'Moscow', lat: 55.7558, lon: 37.6176 },
  'MX': { country: 'Mexico', countryCode: 'MX', region: 'Mexico City', city: 'Mexico City', lat: 19.4326, lon: -99.1332 },
  'NL': { country: 'Netherlands', countryCode: 'NL', region: 'North Holland', city: 'Amsterdam', lat: 52.3676, lon: 4.9041 },
  'IT': { country: 'Italy', countryCode: 'IT', region: 'Lazio', city: 'Rome', lat: 41.9028, lon: 12.4964 },
  'ES': { country: 'Spain', countryCode: 'ES', region: 'Madrid', city: 'Madrid', lat: 40.4168, lon: -3.7038 },
  'KR': { country: 'South Korea', countryCode: 'KR', region: 'Seoul', city: 'Seoul', lat: 37.5665, lon: 126.9780 },
  'SG': { country: 'Singapore', countryCode: 'SG', region: 'Singapore', city: 'Singapore', lat: 1.3521, lon: 103.8198 },
  'IE': { country: 'Ireland', countryCode: 'IE', region: 'Leinster', city: 'Dublin', lat: 53.3498, lon: -6.2603 },
  'IS': { country: 'Iceland', countryCode: 'IS', region: 'Capital Region', city: 'Reykjavik', lat: 64.1466, lon: -21.9426 },
  'NO': { country: 'Norway', countryCode: 'NO', region: 'Oslo', city: 'Oslo', lat: 59.9139, lon: 10.7522 },
  'SE': { country: 'Sweden', countryCode: 'SE', region: 'Stockholm', city: 'Stockholm', lat: 59.3293, lon: 18.0686 },
  'FI': { country: 'Finland', countryCode: 'FI', region: 'Uusimaa', city: 'Helsinki', lat: 60.1699, lon: 24.9384 },
  'DK': { country: 'Denmark', countryCode: 'DK', region: 'Capital Region', city: 'Copenhagen', lat: 55.6761, lon: 12.5683 },
  'CH': { country: 'Switzerland', countryCode: 'CH', region: 'Zurich', city: 'Zurich', lat: 47.3769, lon: 8.5417 },
  'AT': { country: 'Austria', countryCode: 'AT', region: 'Vienna', city: 'Vienna', lat: 48.2082, lon: 16.3738 },
  'BE': { country: 'Belgium', countryCode: 'BE', region: 'Brussels', city: 'Brussels', lat: 50.8503, lon: 4.3517 },
  'LU': { country: 'Luxembourg', countryCode: 'LU', region: 'Luxembourg', city: 'Luxembourg', lat: 49.6116, lon: 6.1319 },
  'PT': { country: 'Portugal', countryCode: 'PT', region: 'Lisbon', city: 'Lisbon', lat: 38.7223, lon: -9.1393 },
  'GR': { country: 'Greece', countryCode: 'GR', region: 'Attica', city: 'Athens', lat: 37.9838, lon: 23.7275 },
  'TR': { country: 'Türkiye', countryCode: 'TR', region: 'Istanbul', city: 'Istanbul', lat: 41.0082, lon: 28.9784 },
  'PL': { country: 'Poland', countryCode: 'PL', region: 'Masovian', city: 'Warsaw', lat: 52.2297, lon: 21.0122 },
  'CZ': { country: 'Czechia', countryCode: 'CZ', region: 'Prague', city: 'Prague', lat: 50.0755, lon: 14.4378 },
  'HU': { country: 'Hungary', countryCode: 'HU', region: 'Budapest', city: 'Budapest', lat: 47.4979, lon: 19.0402 },
  'RO': { country: 'Romania', countryCode: 'RO', region: 'Bucharest', city: 'Bucharest', lat: 44.4268, lon: 26.1025 },
  'BG': { country: 'Bulgaria', countryCode: 'BG', region: 'Sofia', city: 'Sofia', lat: 42.6977, lon: 23.3219 },
  'HR': { country: 'Croatia', countryCode: 'HR', region: 'Zagreb', city: 'Zagreb', lat: 45.8150, lon: 15.9819 },
  'SI': { country: 'Slovenia', countryCode: 'SI', region: 'Ljubljana', city: 'Ljubljana', lat: 46.0569, lon: 14.5058 },
  'SK': { country: 'Slovakia', countryCode: 'SK', region: 'Bratislava', city: 'Bratislava', lat: 48.1486, lon: 17.1077 },
  'EE': { country: 'Estonia', countryCode: 'EE', region: 'Harju', city: 'Tallinn', lat: 59.4370, lon: 24.7536 },
  'LV': { country: 'Latvia', countryCode: 'LV', region: 'Riga', city: 'Riga', lat: 56.9496, lon: 24.1052 },
  'LT': { country: 'Lithuania', countryCode: 'LT', region: 'Vilnius', city: 'Vilnius', lat: 54.6872, lon: 25.2797 },
  'LI': { country: 'Liechtenstein', countryCode: 'LI', region: 'Vaduz', city: 'Vaduz', lat: 47.1410, lon: 9.5209 },
  'ZA': { country: 'South Africa', countryCode: 'ZA', region: 'Western Cape', city: 'Cape Town', lat: -33.9249, lon: 18.4241 },
  'EG': { country: 'Egypt', countryCode: 'EG', region: 'Cairo', city: 'Cairo', lat: 30.0444, lon: 31.2357 },
  'NG': { country: 'Nigeria', countryCode: 'NG', region: 'Lagos', city: 'Lagos', lat: 6.5244, lon: 3.3792 },
  'KE': { country: 'Kenya', countryCode: 'KE', region: 'Nairobi', city: 'Nairobi', lat: -1.2921, lon: 36.8219 },
  'TH': { country: 'Thailand', countryCode: 'TH', region: 'Bangkok', city: 'Bangkok', lat: 13.7563, lon: 100.5018 },
  'VN': { country: 'Vietnam', countryCode: 'VN', region: 'Ho Chi Minh City', city: 'Ho Chi Minh City', lat: 10.8231, lon: 106.6297 },
  'MY': { country: 'Malaysia', countryCode: 'MY', region: 'Kuala Lumpur', city: 'Kuala Lumpur', lat: 3.1390, lon: 101.6869 },
  'PH': { country: 'Philippines', countryCode: 'PH', region: 'Metro Manila', city: 'Manila', lat: 14.5995, lon: 120.9842 },
  'ID': { country: 'Indonesia', countryCode: 'ID', region: 'Jakarta', city: 'Jakarta', lat: -6.2088, lon: 106.8456 },
  'AR': { country: 'Argentina', countryCode: 'AR', region: 'Buenos Aires', city: 'Buenos Aires', lat: -34.6118, lon: -58.3960 },
  'CL': { country: 'Chile', countryCode: 'CL', region: 'Santiago', city: 'Santiago', lat: -33.4489, lon: -70.6693 },
  'CO': { country: 'Colombia', countryCode: 'CO', region: 'Bogotá', city: 'Bogotá', lat: 4.7110, lon: -74.0721 },
  'PE': { country: 'Peru', countryCode: 'PE', region: 'Lima', city: 'Lima', lat: -12.0464, lon: -77.0428 },
  'VE': { country: 'Venezuela', countryCode: 'VE', region: 'Caracas', city: 'Caracas', lat: 10.4806, lon: -66.9036 },
  'UY': { country: 'Uruguay', countryCode: 'UY', region: 'Montevideo', city: 'Montevideo', lat: -34.9011, lon: -56.1645 },
  'EC': { country: 'Ecuador', countryCode: 'EC', region: 'Pichincha', city: 'Quito', lat: -0.1807, lon: -78.4678 },
  'BO': { country: 'Bolivia', countryCode: 'BO', region: 'La Paz', city: 'La Paz', lat: -16.5000, lon: -68.1193 },
  'PY': { country: 'Paraguay', countryCode: 'PY', region: 'Asunción', city: 'Asunción', lat: -25.2637, lon: -57.5759 },
};

// Fast IP-based geolocation lookup (no API calls)
export function getLocationFromIP(ip) {
  try {
    // Skip local/private IPs
    if (
      ip.startsWith('127.') ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip === '::1' ||
      ip.startsWith('169.254.') ||
      ip.startsWith('224.') ||
      ip.startsWith('240.')
    ) {
      return null;
    }

    // Skip only RFC 1918 private IP ranges, not all 172.x.x.x
    if (ip.startsWith('172.')) {
      const secondOctet = parseInt(ip.split('.')[1]);
      if (secondOctet >= 16 && secondOctet <= 31) {
        return null; // RFC 1918 private range
      }
      // 172.32-172.255 are public IPs, don't filter them
    }

    const ipInt = ipToInt(ip);
    if (ipInt === 0) return null;

    // First, check specific IP ranges
    for (const range of IP_RANGES) {
      if (ipInt >= range.start && ipInt <= range.end) {
        return {
          ip: ip,
          country: range.country,
          countryCode: range.countryCode,
          region: range.region,
          city: range.city,
          lat: range.lat,
          lon: range.lon,
          timezone: getTimezoneForLocation(range.countryCode)
        };
      }
    }

    // Fallback: Try to determine country from first octet patterns
    const firstOctet = parseInt(ip.split('.')[0]);
    let countryCode = null;

    // Some basic heuristics for common country IP ranges
    if (firstOctet >= 3 && firstOctet <= 126) {
      // Most likely US
      countryCode = 'US';
    } else if (firstOctet >= 128 && firstOctet <= 191) {
      // Could be various countries, use regional heuristics
      const secondOctet = parseInt(ip.split('.')[1]);
      if (secondOctet >= 0 && secondOctet <= 63) {
        countryCode = 'US';
      } else if (secondOctet >= 64 && secondOctet <= 127) {
        countryCode = 'EU'; // Europe fallback
      } else {
        countryCode = 'US'; // Default to US
      }
    } else if (firstOctet >= 192 && firstOctet <= 223) {
      // Class C - mixed regions
      countryCode = 'US';
    }

    // If we found a country code, use the fallback location
    if (countryCode && COUNTRY_LOCATIONS[countryCode]) {
      const location = COUNTRY_LOCATIONS[countryCode];
      return {
        ip: ip,
        country: location.country,
        countryCode: location.countryCode,
        region: location.region,
        city: location.city,
        lat: location.lat,
        lon: location.lon,
        timezone: getTimezoneForLocation(location.countryCode)
      };
    }

    // Final fallback - return US default
    const usDefault = COUNTRY_LOCATIONS['US'];
    return {
      ip: ip,
      country: usDefault.country,
      countryCode: usDefault.countryCode,
      region: usDefault.region,
      city: usDefault.city,
      lat: usDefault.lat,
      lon: usDefault.lon,
      timezone: getTimezoneForLocation('US')
    };

  } catch (error) {
    console.error(`Error getting location for IP ${ip}:`, error.message);
    return null;
  }
}

// Simple timezone mapping based on country code
function getTimezoneForLocation(countryCode) {
  const timezoneMap = {
    'US': 'America/New_York',
    'CA': 'America/Toronto',
    'GB': 'Europe/London',
    'FR': 'Europe/Paris',
    'DE': 'Europe/Berlin',
    'IT': 'Europe/Rome',
    'ES': 'Europe/Madrid',
    'NL': 'Europe/Amsterdam',
    'CH': 'Europe/Zurich',
    'AT': 'Europe/Vienna',
    'BE': 'Europe/Brussels',
    'SE': 'Europe/Stockholm',
    'NO': 'Europe/Oslo',
    'DK': 'Europe/Copenhagen',
    'FI': 'Europe/Helsinki',
    'PL': 'Europe/Warsaw',
    'CZ': 'Europe/Prague',
    'JP': 'Asia/Tokyo',
    'CN': 'Asia/Shanghai',
    'IN': 'Asia/Kolkata',
    'AU': 'Australia/Sydney',
    'SG': 'Asia/Singapore',
    'KR': 'Asia/Seoul',
    'TH': 'Asia/Bangkok',
    'BR': 'America/Sao_Paulo',
    'MX': 'America/Mexico_City',
    'RU': 'Europe/Moscow',
    'TR': 'Europe/Istanbul',
    'IE': 'Europe/Dublin',
    'IS': 'Atlantic/Reykjavik',
    'PT': 'Europe/Lisbon',
    'GR': 'Europe/Athens',
    'ZA': 'Africa/Johannesburg',
    'EG': 'Africa/Cairo',
    'NG': 'Africa/Lagos',
    'KE': 'Africa/Nairobi',
    'LI': 'Europe/Vaduz'
  };
  
  return timezoneMap[countryCode] || 'UTC';
}

export default { getLocationFromIP };
