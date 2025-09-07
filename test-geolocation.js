// Test geolocation for the Portugal IP
async function testGeolocation() {
  const ip = '212.97.70.29';

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,query`);

    if (!response.ok) {
      console.error('HTTP error:', response.status);
      return;
    }

    const data = await response.json();
    console.log('Geolocation result for', ip, ':');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testGeolocation();
