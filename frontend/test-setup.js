#!/usr/bin/env node
/**
 * Frontend setup test script
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Mistral Playground Frontend Test');
console.log('='.repeat(40));

// Check if package.json exists
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
    console.log('❌ package.json not found');
    process.exit(1);
}

console.log('✅ package.json found');

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
    console.log('⚠️  node_modules not found. Run "npm install" first.');
    console.log('\n📝 To install dependencies:');
    console.log('   cd frontend');
    console.log('   npm install');
    process.exit(1);
}

console.log('✅ node_modules found');

// Check for key dependencies
const keyDeps = [
    'react',
    'react-dom',
    'react-router-dom',
    'vite',
    'typescript',
    'tailwindcss'
];

console.log('\n📦 Checking key dependencies...');
let allDepsFound = true;

keyDeps.forEach(dep => {
    const depPath = path.join(nodeModulesPath, dep);
    if (fs.existsSync(depPath)) {
        console.log(`✅ ${dep} found`);
    } else {
        console.log(`❌ ${dep} not found`);
        allDepsFound = false;
    }
});

if (!allDepsFound) {
    console.log('\n❌ Some dependencies are missing. Please run "npm install" again.');
    process.exit(1);
}

// Check if src directory exists
const srcPath = path.join(__dirname, 'src');
if (!fs.existsSync(srcPath)) {
    console.log('❌ src directory not found');
    process.exit(1);
}

console.log('✅ src directory found');

// Check for key source files
const keyFiles = [
    'src/main.tsx',
    'src/App.tsx',
    'src/index.css',
    'index.html'
];

console.log('\n📁 Checking key source files...');
let allFilesFound = true;

keyFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} found`);
    } else {
        console.log(`❌ ${file} not found`);
        allFilesFound = false;
    }
});

if (!allFilesFound) {
    console.log('\n❌ Some source files are missing.');
    process.exit(1);
}

console.log('\n🎉 Frontend test completed successfully!');
console.log('\n📝 Next steps:');
console.log('1. Start the frontend: npm run dev');
console.log('2. Visit: http://localhost:5173');
console.log('3. Make sure the backend is also running'); 