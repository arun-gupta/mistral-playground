#!/usr/bin/env node

/**
 * Post-installation script to re-add tailwindcss-animate to tailwind.config.js
 * This fixes the VS Code Tailwind extension error in Codespaces
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'tailwind.config.js');

try {
  // Read the current config
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Check if tailwindcss-animate is already imported
  if (!configContent.includes('tailwindcss-animate')) {
    console.log('🔄 Re-adding tailwindcss-animate to tailwind.config.js...');
    
    // Add the import at the top
    configContent = `// Import tailwindcss-animate
import tailwindcssAnimate from "tailwindcss-animate"

${configContent}`;
    
    // Replace the plugins array
    configContent = configContent.replace(
      /plugins: \[\],/,
      'plugins: [tailwindcssAnimate],'
    );
    
    // Remove the temporary comment
    configContent = configContent.replace(
      /\/\/ Temporarily removed tailwindcss-animate to fix Codespaces VS Code extension error\n  \/\/ Will be re-added after dependencies are installed\n/,
      ''
    );
    
    // Write the updated config
    fs.writeFileSync(configPath, configContent);
    console.log('✅ tailwindcss-animate re-added to tailwind.config.js');
  } else {
    console.log('✅ tailwindcss-animate already present in tailwind.config.js');
  }
} catch (error) {
  console.error('❌ Error updating tailwind.config.js:', error.message);
  process.exit(1);
} 