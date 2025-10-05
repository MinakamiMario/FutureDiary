// scripts/final-analysis.js
// Complete analysis based on Kimi K2's findings
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'src');
const REPORTS_DIR = path.join(__dirname, 'reports');

if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

console.log('🔍 Final analysis based on Kimi K2 findings...\n');

// Read ActivityTrackingService.js
const activityServicePath = path.join(SRC, 'services/data/ActivityTrackingService.js');
const content = fs.readFileSync(activityServicePath, 'utf8');

console.log('📊 File analysis:');
console.log(`   Path: ${activityServicePath}`);
console.log(`   Size: ${content.length} characters`);
console.log(`   Lines: ${content.split('\n').length}`);

// Kimi's specific findings - these should be checked for usage
const kimiFindings = {
  foundUsed: [
    'healthDataService.isAvailable',
    'healthDataService.requestPermissions', 
    'healthDataService.openHealthConnectSettings',
    'healthDataService.openHealthConnectPermissions',
    'healthDataService.openHealthConnectInPlayStore',
    'healthDataService.importHealthData'
  ],
  notUsed: [
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
  ]
};

// Find function definitions
function findFunctionDefinitions(content, functionName) {
  const patterns = [
    new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${functionName}\\\\s*\\\\(`, 'g'),
    new RegExp(`${functionName}\\\\s*\\\\(\\\\s*[^)]*\\\\)\\\\s*{`, 'g'),
    new RegExp(`\\b${functionName}\\s*=\\s*(?:async\\s+)?(?:\\([^)]*\\)\\s*=>|function\\s*\\()`, 'g')
  ];
  
  const definitions = [];
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      // Find the line number
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      definitions.push({
        line: lineNumber,
        match: match[0].trim()
      });
    }
  });
  return definitions;
}

// Find function usage (calls)
function findFunctionUsage(content, functionName) {
  const usagePattern = new RegExp(`\\b${functionName}\\\\s*\\\\(`, 'g');
  const usages = [];
  let match;
  
  while ((match = usagePattern.exec(content)) !== null) {
    // Check if it's not a definition
    const beforeMatch = content.substring(Math.max(0, match.index - 50), match.index);
    if (!beforeMatch.includes('function') && !beforeMatch.includes('=>')) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      usages.push({
        line: lineNumber,
        context: content.split('\n')[lineNumber - 1].trim()
      });
    }
  }
  return usages;
}

// Analyze each suspicious function
console.log('\n🚨 Analyzing suspicious functions (Kimi K2 findings):\n');

const analysisResults = {
  timestamp: new Date().toISOString(),
  file: 'services/data/ActivityTrackingService.js',
  findings: {}
};

kimiFindings.notUsed.forEach(functionName => {
  console.log(`🔍 ${functionName}:`);
  
  const definitions = findFunctionDefinitions(content, functionName);
  const usages = findFunctionUsage(content, functionName);
  
  analysisResults.findings[functionName] = {
    definitions: definitions.length,
    usages: usages.length,
    defined: definitions.length > 0,
    used: usages.length > 0,
    definitionLines: definitions.map(d => d.line),
    usageLines: usages.map(u => u.line)
  };
  
  if (definitions.length > 0) {
    console.log(`   📋 Defined at lines: ${definitions.map(d => d.line).join(', ')}`);
  } else {
    console.log(`   ⚠️  No definition found`);
  }
  
  if (usages.length > 0) {
    console.log(`   ✅ Used at lines: ${usages.map(u => u.line).join(', ')}`);
  } else {
    console.log(`   ❌ NO USAGE FOUND`);
  }
  
  console.log('');
});

// Check usage in other files
console.log('🔍 Checking usage in other files...\n');

function searchInOtherFiles(functionName) {
  const results = [];
  
  function searchDirectory(dir, basePath = '') {
    try {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const relativePath = path.join(basePath, item);
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            searchDirectory(fullPath, relativePath);
          } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.jsx') || item.endsWith('.ts') || item.endsWith('.tsx'))) {
            
            // Skip the activity service itself
            if (fullPath.includes('ActivityTrackingService.js')) return;
            
            const content = fs.readFileSync(fullPath, 'utf8');
            const pattern = new RegExp(`\\b${functionName}\\b`, 'g');
            const matches = content.match(pattern);
            
            if (matches) {
              const lines = content.split('\n');
              lines.forEach((line, index) => {
                if (line.includes(functionName)) {
                  results.push({
                    file: relativePath,
                    line: index + 1,
                    content: line.trim()
                  });
                }
              });
            }
          }
        } catch (error) {
          // Skip files that can't be read
        }
      });
    } catch (error) {
      // Skip directories that can't be read
    }
  }
  
  searchDirectory(SRC);
  return results;
}

// Check usage of suspicious functions in other files
kimiFindings.notUsed.forEach(functionName => {
  const externalUsage = searchInOtherFiles(functionName);
  
  if (externalUsage.length > 0) {
    console.log(`✅ ${functionName} found in other files:`);
    externalUsage.slice(0, 3).forEach(usage => {
      console.log(`   ${usage.file}:${usage.line} - ${usage.content}`);
    });
    if (externalUsage.length > 3) {
      console.log(`   ... and ${externalUsage.length - 3} more`);
    }
    analysisResults.findings[functionName].externalUsage = externalUsage.length;
  } else {
    console.log(`❌ ${functionName} - NO EXTERNAL USAGE FOUND`);
    analysisResults.findings[functionName].externalUsage = 0;
  }
});

// Generate final report
const finalReport = {
  summary: {
    totalSuspiciousFunctions: kimiFindings.notUsed.length,
    functionsWithNoUsage: 0,
    functionsWithExternalUsage: 0,
    recommendation: 'QUARANTINE'
  },
  details: analysisResults
};

// Count functions with no usage
Object.values(analysisResults.findings).forEach(finding => {
  if (finding.usages === 0 && finding.externalUsage === 0) {
    finalReport.summary.functionsWithNoUsage++;
  } else if (finding.externalUsage > 0) {
    finalReport.summary.functionsWithExternalUsage++;
  }
});

console.log('\n=== FINAL ANALYSIS RESULTS ===');
console.log(`📊 Total suspicious functions: ${finalReport.summary.totalSuspiciousFunctions}`);
console.log(`❌ Functions with NO usage: ${finalReport.summary.functionsWithNoUsage}`);
console.log(`✅ Functions with external usage: ${finalReport.summary.functionsWithExternalUsage}`);
console.log(`🎯 Recommendation: ${finalReport.summary.recommendation}`);

// Save report
const reportPath = path.join(REPORTS_DIR, 'final-analysis.json');
fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));

console.log(`\n📁 Report saved: ${reportPath}`);

// Generate actionable summary
const actionableItems = Object.entries(analysisResults.findings)
  .filter(([_, finding]) => finding.usages === 0 && finding.externalUsage === 0)
  .map(([name, _]) => name);

console.log('\n🎯 ACTIONABLE ITEMS (safe to quarantine/remove):');
actionableItems.forEach(item => console.log(`   - ${item}`));

console.log('\n📋 Next steps:');
console.log('1. QUARANTINE the functions listed above');
console.log('2. Keep functions that have external usage');
console.log('3. Review WIRE items (functions that should be used but aren\'t)');
console.log('4. Test thoroughly after cleanup');

module.exports = { finalReport, actionableItems };