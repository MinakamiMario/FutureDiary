// scripts/simple-usage-analysis.js
// Simple analysis based on Kimi K2 findings
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'src');

console.log('🔍 Simple usage analysis based on Kimi K2 findings...\n');

// Read ActivityTrackingService.js
const activityServicePath = path.join(SRC, 'services/data/ActivityTrackingService.js');
const content = fs.readFileSync(activityServicePath, 'utf8');

console.log('📊 File analysis:');
console.log(`   Path: ${activityServicePath}`);
console.log(`   Size: ${content.length} characters`);
console.log(`   Lines: ${content.split('\n').length}`);

// Kimi's findings - functions that are NOT used
const suspiciousFunctions = [
  'extractFeatures',
  'classifyActivity',
  'calculateMovementPattern', 
  'detectSteps',
  'formatStepsRecords',
  'formatHeartRateRecords',
  'formatExerciseRecords',
  'formatSleepRecords',
  'formatDistanceRecords',
  'formatCaloriesRecords',
  'calculateHealthScore',
  'getMockLocation'
];

console.log('\n🚨 Checking suspicious functions (Kimi K2 findings):\n');

const results = {};

suspiciousFunctions.forEach(funcName => {
  console.log(`🔍 ${funcName}:`);
  
  // Check if function is defined
  const definitionPatterns = [
    `function ${funcName}(`,
    `${funcName}(`,
    `${funcName} =`,
    `${funcName}:`
  ];
  
  let isDefined = false;
  let definitionLine = null;
  
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (definitionPatterns.some(pattern => line.includes(pattern))) {
      isDefined = true;
      definitionLine = i + 1;
      break;
    }
  }
  
  // Check usage (function calls)
  const usagePattern = new RegExp(`\\b${funcName}\\s*\\(`, 'g');
  const usageMatches = content.match(usagePattern) || [];
  
  // Filter out definitions (simple heuristic)
  const realUsages = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(funcName) && line.includes('(')) {
      // Skip definition lines
      if (!line.includes('function') && !line.includes('=') && !line.includes(':')) {
        realUsages.push(i + 1);
      }
    }
  }
  
  results[funcName] = {
    defined: isDefined,
    definitionLine: definitionLine,
    totalReferences: usageMatches.length,
    realUsages: realUsages.length,
    usageLines: realUsages
  };
  
  if (isDefined) {
    console.log(`   📋 Defined at line ${definitionLine}`);
  } else {
    console.log(`   ⚠️  Not defined in this file`);
  }
  
  if (realUsages.length > 0) {
    console.log(`   ✅ Used at lines: ${realUsages.join(', ')}`);
  } else {
    console.log(`   ❌ NO USAGE FOUND`);
  }
  
  console.log('');
});

// Check external usage
console.log('🔍 Checking external usage in other files...\n');

function searchInOtherFiles(functionName) {
  const results = [];
  
  function walkDirectory(dir, basePath = '') {
    try {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const relativePath = path.join(basePath, item);
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'reports') {
            walkDirectory(fullPath, relativePath);
          } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.jsx'))) {
            
            if (fullPath.includes('ActivityTrackingService.js')) return;
            
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
              if (line.includes(functionName) && line.includes('(') && !line.includes('function')) {
                results.push({
                  file: relativePath,
                  line: index + 1,
                  content: line.trim()
                });
              }
            });
          }
        } catch (error) {
          // Skip
        }
      });
    } catch (error) {
      // Skip
    }
  }
  
  walkDirectory(SRC);
  return results;
}

// Check each function
Object.keys(results).forEach(funcName => {
  const externalUsage = searchInOtherFiles(funcName);
  
  if (externalUsage.length > 0) {
    console.log(`✅ ${funcName} - Found in other files:`);
    externalUsage.slice(0, 2).forEach(usage => {
      console.log(`   ${usage.file}:${usage.line}`);
    });
    if (externalUsage.length > 2) {
      console.log(`   ... and ${externalUsage.length - 2} more`);
    }
    results[funcName].externalUsage = externalUsage.length;
  } else {
    console.log(`❌ ${funcName} - NO EXTERNAL USAGE`);
    results[funcName].externalUsage = 0;
  }
});

// Generate summary
const summary = {
  totalFunctions: Object.keys(results).length,
  functionsWithNoUsage: 0,
  functionsWithExternalUsage: 0,
  functionsWithInternalUsage: 0,
  actionableItems: []
};

Object.entries(results).forEach(([funcName, data]) => {
  if (data.realUsages === 0 && data.externalUsage === 0) {
    summary.functionsWithNoUsage++;
    summary.actionableItems.push(funcName);
  } else if (data.externalUsage > 0) {
    summary.functionsWithExternalUsage++;
  } else if (data.realUsages > 0) {
    summary.functionsWithInternalUsage++;
  }
});

console.log('\n=== SUMMARY ===');
console.log(`📊 Total suspicious functions: ${summary.totalFunctions}`);
console.log(`❌ Functions with NO usage: ${summary.functionsWithNoUsage}`);
console.log(`✅ Functions with external usage: ${summary.functionsWithExternalUsage}`);
console.log(`🔄 Functions with internal usage: ${summary.functionsWithInternalUsage}`);

console.log('\n🎯 ACTIONABLE ITEMS (safe to quarantine):');
summary.actionableItems.forEach(item => console.log(`   - ${item}`));

// Save report
const report = {
  timestamp: new Date().toISOString(),
  results: results,
  summary: summary
};

const reportPath = path.join(__dirname, 'reports', 'simple-usage-analysis.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n📁 Report saved: ${reportPath}`);

module.exports = { summary, actionableItems: summary.actionableItems };