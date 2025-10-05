#!/bin/bash

# Build Production APK Script
# Creates a production-ready APK with evidence-based analysis included

echo "🔨 Starting production APK build..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
npm run android:clean

# Create production directory
echo "📁 Creating production directory..."
mkdir -p production

# Build production APK
echo "🏗️ Building production APK..."
cd android && ./gradlew assembleRelease

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ APK build successful!"
    
    # Find the APK file
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    
    if [ -f "$APK_PATH" ]; then
        # Move APK to production directory
        cp "$APK_PATH" ../production/MinakamiApp-production-evidence-$(date +%Y%m%d-%H%M%S).apk
        
        # Get APK info
        APK_SIZE=$(ls -lh ../production/*.apk | tail -1 | awk '{print $5}')
        APK_NAME=$(ls -t ../production/*.apk | head -1)
        
        echo "📦 APK Details:"
        echo "   📍 Location: $APK_NAME"
        echo "   📏 Size: $APK_SIZE"
        echo "   🏷️  Build: Production (with evidence-based analysis)"
        
        # Copy analysis reports to production folder
        echo "📊 Copying analysis reports..."
        mkdir -p ../production/analysis-reports
        cp -r ../scripts/reports/* ../production/analysis-reports/ 2>/dev/null || true
        cp ../EVIDENCE_ANALYSIS_SUMMARY.md ../production/
        
        echo "✨ Production APK ready with evidence-based analysis!"
        echo "📋 Summary available in: production/EVIDENCE_ANALYSIS_SUMMARY.md"
        
    else
        echo "❌ APK file not found at: $APK_PATH"
        exit 1
    fi
    
else
    echo "❌ APK build failed!"
    exit 1
fi

echo "🎉 Build process completed!"