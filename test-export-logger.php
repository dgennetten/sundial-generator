<?php
/**
 * Test script for export-logger.php
 * This script simulates a POST request to test the export logging functionality
 */

// Test data
$testData = [
    'exportFormat' => 'PNG',
    'pageSize' => 'Letter',
    'dateRange' => 'SummerToFall',
    'gnomonType' => 'crosshair-with-north',
    'locationName' => 'Fort Collins, CO USA'
];

echo "<h2>Export Logger Test Results</h2>";
echo "<p><strong>Test Data:</strong></p>";
echo "<pre>" . print_r($testData, true) . "</pre>";

// Test 1: Direct file include (simulates the actual export process)
echo "<h3>Test 1: Direct File Include</h3>";
echo "<p>This simulates what happens when the script is called directly:</p>";

// Capture output
ob_start();
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['CONTENT_TYPE'] = 'application/json';
file_put_contents('php://input', json_encode($testData));

// Include the export-logger.php file
include_once 'export-logger.php';

$directResponse = ob_get_clean();

echo "<p><strong>Direct Response:</strong></p>";
echo "<pre>" . htmlspecialchars($directResponse) . "</pre>";

// Test 2: HTTP POST request
echo "<h3>Test 2: HTTP POST Request</h3>";

// Create a POST request context
$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => json_encode($testData)
    ]
]);

// Make the request to export-logger.php
$url = 'http://localhost/export-logger.php'; // Adjust URL as needed
$response = file_get_contents($url, false, $context);

if ($response === false) {
    echo "<p><strong>Error:</strong> Failed to make request to export-logger.php</p>";
    echo "<p>Make sure the script is accessible and the URL is correct.</p>";
} else {
    echo "<p><strong>HTTP Response:</strong></p>";
    echo "<pre>" . htmlspecialchars($response) . "</pre>";
    
    // Try to decode JSON response
    $result = json_decode($response, true);
    if ($result) {
        echo "<p><strong>Decoded HTTP Response:</strong></p>";
        echo "<pre>" . print_r($result, true) . "</pre>";
        
        if (isset($result['success']) && $result['success']) {
            echo "<p><strong>✅ Export logging test successful!</strong></p>";
            echo "<p>Check the log file and your email for confirmation.</p>";
        } else {
            echo "<p><strong>❌ Export logging test failed!</strong></p>";
            if (isset($result['message'])) {
                echo "<p>Error: " . htmlspecialchars($result['message']) . "</p>";
            }
        }
        
        // Show debug information if available
        if (isset($result['debug'])) {
            echo "<h4>Debug Information:</h4>";
            echo "<pre>" . print_r($result['debug'], true) . "</pre>";
        }
    } else {
        echo "<p><strong>❌ Failed to decode JSON response</strong></p>";
        echo "<p>Raw response: " . htmlspecialchars($response) . "</p>";
    }
}

echo "<p><strong>Test completed.</strong></p>";
?>
