#!/usr/bin/env node

/**
 * Script to fix icon display issues in React Native Android builds
 * This script ensures all vector icon fonts are properly copied to Android assets
 */

const fs = require('fs');
const path = require('path');

const VECTOR_ICONS_FONTS = path.join(__dirname, '../node_modules/react-native-vector-icons/Fonts');
const ANDROID_ASSETS_FONTS = path.join(__dirname, '../android/app/src/main/assets/fonts');

console.log('🔧 Fixing React Native Vector Icons for Android...');

// Create assets/fonts directory if it doesn't exist
if (!fs.existsSync(ANDROID_ASSETS_FONTS)) {
  console.log('📁 Creating assets/fonts directory...');
  fs.mkdirSync(ANDROID_ASSETS_FONTS, { recursive: true });
}

// Copy all font files
console.log('📋 Copying font files to Android assets...');
const fontFiles = fs.readdirSync(VECTOR_ICONS_FONTS).filter(file => file.endsWith('.ttf'));

fontFiles.forEach(fontFile => {
  const sourcePath = path.join(VECTOR_ICONS_FONTS, fontFile);
  const destPath = path.join(ANDROID_ASSETS_FONTS, fontFile);
  
  try {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Copied ${fontFile}`);
  } catch (error) {
    console.error(`❌ Failed to copy ${fontFile}:`, error.message);
  }
});

console.log(`🎉 Successfully copied ${fontFiles.length} font files!`);
console.log('');
console.log('📝 Next steps:');
console.log('1. Clean your build: cd android && ./gradlew clean');
console.log('2. Rebuild the app: cd .. && npm run android');
console.log('3. The icons should now display correctly instead of showing Chinese characters or crosses');