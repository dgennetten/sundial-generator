<?php
/**
 * Permission and Directory Checker for Export Logger
 * This script helps diagnose why the export logging might not be working
 */

echo "<h2>Export Logger Permission Check</h2>";

// Check current working directory
echo "<h3>Current Working Directory</h3>";
echo "<p><strong>Current Directory:</strong> " . getcwd() . "</p>";
echo "<p><strong>Script Location:</strong> " . __FILE__ . "</p>";

// Check possible log directories
echo "<h3>Log Directory Check</h3>";
$possibleLogDirs = [
    '/home/dgennetten/sundial.gennetten.org/logs',
    '/home/dgennetten/sundial-generator/logs',
    './logs',
    '../logs',
    dirname(__FILE__) . '/logs'
];

foreach ($possibleLogDirs as $dir) {
    echo "<h4>Checking: $dir</h4>";
    
    $exists = is_dir($dir);
    $readable = $exists ? is_readable($dir) : false;
    $writable = $exists ? is_writable($dir) : false;
    $executable = $exists ? is_executable($dir) : false;
    
    echo "<ul>";
    echo "<li><strong>Exists:</strong> " . ($exists ? '✅ Yes' : '❌ No') . "</li>";
    echo "<li><strong>Readable:</strong> " . ($readable ? '✅ Yes' : '❌ No') . "</li>";
    echo "<li><strong>Writable:</strong> " . ($writable ? '✅ Yes' : '❌ No') . "</li>";
    echo "<li><strong>Executable:</strong> " . ($executable ? '✅ Yes' : '❌ No') . "</li>";
    
    if ($exists) {
        $perms = fileperms($dir);
        echo "<li><strong>Permissions:</strong> " . substr(sprintf('%o', $perms), -4) . "</li>";
        
        // Try to create a test file
        $testFile = $dir . '/test-' . time() . '.txt';
        $testWrite = file_put_contents($testFile, 'Test write at ' . date('Y-m-d H:i:s'));
        
        if ($testWrite !== false) {
            echo "<li><strong>Test Write:</strong> ✅ Success (" . $testWrite . " bytes)</li>";
            // Clean up test file
            unlink($testFile);
            echo "<li><strong>Test Cleanup:</strong> ✅ Success</li>";
        } else {
            echo "<li><strong>Test Write:</strong> ❌ Failed</li>";
        }
    }
    echo "</ul>";
}

// Check web server user
echo "<h3>Web Server Information</h3>";
echo "<p><strong>PHP Version:</strong> " . phpversion() . "</p>";
echo "<p><strong>Server Software:</strong> " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Unknown') . "</p>";
echo "<p><strong>User ID:</strong> " . getmyuid() . "</p>";
echo "<p><strong>Group ID:</strong> " . getmygid() . "</p>";

// Check if we can create a logs directory in current location
echo "<h3>Creating Logs Directory Test</h3>";
$currentLogsDir = './logs';
$canCreate = false;

if (!is_dir($currentLogsDir)) {
    $canCreate = mkdir($currentLogsDir, 0755, true);
    echo "<p><strong>Creating $currentLogsDir:</strong> " . ($canCreate ? '✅ Success' : '❌ Failed') . "</p>";
} else {
    echo "<p><strong>$currentLogsDir already exists</strong></p>";
    $canCreate = true;
}

if ($canCreate) {
    $testLogFile = $currentLogsDir . '/export.log';
    $testLogEntry = date('Y-m-d H:i:s') . "; Test entry\n";
    $logWrite = file_put_contents($testLogFile, $testLogEntry, FILE_APPEND);
    
    if ($logWrite !== false) {
        echo "<p><strong>Test log write:</strong> ✅ Success (" . $logWrite . " bytes)</p>";
        echo "<p><strong>Log file contents:</strong></p>";
        echo "<pre>" . htmlspecialchars(file_get_contents($testLogFile)) . "</pre>";
    } else {
        echo "<p><strong>Test log write:</strong> ❌ Failed</p>";
    }
}

// Check PHP error log
echo "<h3>PHP Error Log</h3>";
$errorLog = ini_get('error_log');
echo "<p><strong>Error Log Path:</strong> " . ($errorLog ?: 'Default') . "</p>";

// Check if we can write to error log
if ($errorLog && file_exists($errorLog)) {
    echo "<p><strong>Error Log Writable:</strong> " . (is_writable($errorLog) ? '✅ Yes' : '❌ No') . "</p>";
} else {
    echo "<p><strong>Error Log Status:</strong> Not accessible or doesn't exist</p>";
}

echo "<p><strong>Check completed.</strong></p>";
?>
