#!/usr/bin/env node

// Cron-friendly visitor data update script
// This script is designed to run via cron job on Dreamhost shared hosting

import { updateVisitorData } from './updateVisitorData.js';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log function with timestamps
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

async function cronUpdate() {
  try {
    log('🚀 Starting automated visitor data update...');
    
    // Change to project directory
    const projectDir = path.join(__dirname, '..');
    process.chdir(projectDir);
    log(`📁 Working directory: ${projectDir}`);
    
    // Update visitor data (7 days by default for frequent updates)
    log('📊 Updating visitor data...');
    await updateVisitorData(7);
    
    // Build the project
    log('🔨 Building project...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Copy visitor data to dist
    log('📋 Copying visitor data to dist...');
    const fs = await import('fs');
    const sourceFile = path.join(projectDir, 'public', 'visitor-data.json');
    const destFile = path.join(projectDir, 'dist', 'visitor-data.json');
    fs.copyFileSync(sourceFile, destFile);
    
    // Deploy to Dreamhost
    log('🚀 Deploying to Dreamhost...');
    execSync('node deploy.js', { stdio: 'inherit' });
    
    log('✅ Automated update completed successfully!');
    
  } catch (error) {
    log(`❌ Error during automated update: ${error.message}`);
    
    // Send error notification (optional)
    // You could add email notification here if needed
    
    process.exit(1);
  }
}

// Run the update
cronUpdate();
