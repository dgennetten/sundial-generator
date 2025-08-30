// Script to check if the export logger is working properly
// This can be run periodically to ensure email functionality is operational

async function checkExportLogger() {
  console.log('🔍 Checking Export Logger Status...');
  console.log('=' .repeat(50));

  const testData = {
    exportFormat: 'HEALTH_CHECK',
    pageSize: 'Letter',
    dateRange: 'FullYear',
    gnomonType: 'crosshair',
    locationName: 'Health Check Test',
    sundialNotesMode: 'none'
  };

  try {
    const url = 'https://sundial.gennetten.org/export-logger.php';
    console.log(`🌐 Testing: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.log('❌ FAILED: Export logger is not responding properly');
      console.log(`   HTTP Status: ${response.status}`);
      return false;
    }

    const text = await response.text();
    
    try {
      const result = JSON.parse(text);
      
      console.log('📋 Response Summary:');
      console.log(`   ✅ Server Response: OK`);
      console.log(`   📝 Logging: ${result.logged ? '✅ Working' : '❌ Failed'}`);
      console.log(`   📧 Email: ${result.emailSent ? '✅ Working' : '❌ Failed'}`);
      console.log(`   🕒 Timestamp: ${result.timestamp}`);
      
      if (result.debug) {
        console.log('\n🔧 System Status:');
        console.log(`   📁 Log Directory: ${result.debug.logDir || 'Not found'}`);
        console.log(`   📄 Log File: ${result.debug.logFile || 'Not found'}`);
        console.log(`   💾 Log Success: ${result.debug.logSuccess ? '✅' : '❌'}`);
      }

      if (!result.emailSent && result.emailError) {
        console.log('\n❌ Email Error Details:');
        console.log(`   ${result.emailError}`);
      }

      const isHealthy = result.success && result.logged && result.emailSent;
      
      console.log('\n' + '=' .repeat(50));
      if (isHealthy) {
        console.log('✅ EXPORT LOGGER IS HEALTHY');
        console.log('   All systems operational: Logging ✅ Email ✅');
      } else {
        console.log('❌ EXPORT LOGGER HAS ISSUES');
        console.log('   Please check the details above');
      }
      
      return isHealthy;

    } catch (parseError) {
      console.log('❌ FAILED: Invalid response from server');
      console.log('   Response was not valid JSON');
      console.log('   First 200 chars:', text.substring(0, 200));
      return false;
    }

  } catch (error) {
    console.log('❌ FAILED: Cannot reach export logger');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Run the check
checkExportLogger()
  .then(isHealthy => {
    process.exit(isHealthy ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  });