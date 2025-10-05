// scripts/generate-classification.js
// Generate classification report based on static and dynamic analysis
const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, 'reports');

console.log('📊 Generating classification report...\n');

// Load analysis results
const staticAnalysis = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'simple-usage-analysis.json'), 'utf8'));

// Kimi's original findings
const kimiEssentialFunctions = [
  'healthDataService.isAvailable',
  'healthDataService.requestPermissions', 
  'healthDataService.openHealthConnectSettings',
  'healthDataService.openHealthConnectPermissions',
  'healthDataService.openHealthConnectInPlayStore',
  'healthDataService.importHealthData'
];

const kimiSuspiciousFunctions = [
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

// Classification categories
const CLASSIFICATIONS = {
  KEEP: 'KEEP',        // Actively used and essential
  WIRE: 'WIRE',        // Should be used but missing integration
  QUARANTINE: 'QUARANTINE', // Not used, move to experimental
  DROP: 'DROP',        // Definitely unused, safe to remove
  INTERNAL: 'INTERNAL' // Only used internally, keep but don't export
};

function classifyFunctions() {
  const classification = {
    timestamp: new Date().toISOString(),
    summary: {
      total: 0,
      keep: 0,
      wire: 0,
      quarantine: 0,
      drop: 0,
      internal: 0
    },
    classifications: {}
  };
  
  // Classify based on usage analysis
  Object.entries(staticAnalysis.results).forEach(([funcName, data]) => {
    classification.summary.total++;
    
    // Essential functions (Kimi's confirmed used)
    if (kimiEssentialFunctions.some(essential => essential.includes(funcName))) {
      classification.classifications[funcName] = {
        classification: CLASSIFICATIONS.KEEP,
        reason: 'Essential function confirmed by Kimi K2',
        usage: data.externalUsage,
        internalUsage: data.realUsages
      };
      classification.summary.keep++;
      return;
    }
    
    // Functions with external usage
    if (data.externalUsage > 0) {
      classification.classifications[funcName] = {
        classification: CLASSIFICATIONS.KEEP,
        reason: `Used in ${data.externalUsage} external files`,
        usage: data.externalUsage,
        internalUsage: data.realUsages
      };
      classification.summary.keep++;
      return;
    }
    
    // Functions with only internal usage
    if (data.realUsages > 0 && data.externalUsage === 0) {
      classification.classifications[funcName] = {
        classification: CLASSIFICATIONS.INTERNAL,
        reason: 'Only used internally within ActivityTrackingService',
        usage: data.externalUsage,
        internalUsage: data.realUsages
      };
      classification.summary.internal++;
      return;
    }
    
    // Functions with no usage at all
    if (data.realUsages === 0 && data.externalUsage === 0) {
      // Check if it's a format function (might be needed for future features)
      if (funcName.startsWith('format')) {
        classification.classifications[funcName] = {
          classification: CLASSIFICATIONS.QUARANTINE,
          reason: 'Format function with no current usage - might be needed for future features',
          usage: data.externalUsage,
          internalUsage: data.realUsages
        };
        classification.summary.quarantine++;
        return;
      }
      
      // Mock functions can be quarantined
      if (funcName.toLowerCase().includes('mock')) {
        classification.classifications[funcName] = {
          classification: CLASSIFICATIONS.QUARANTINE,
          reason: 'Mock function - useful for testing but not production',
          usage: data.externalUsage,
          internalUsage: data.realUsages
        };
        classification.summary.quarantine++;
        return;
      }
      
      // Core algorithm functions - might be needed
      if (['extractFeatures', 'classifyActivity', 'calculateMovementPattern', 'detectSteps'].includes(funcName)) {
        classification.classifications[funcName] = {
          classification: CLASSIFICATIONS.QUARANTINE,
          reason: 'Core algorithm function - might be needed for advanced features',
          usage: data.externalUsage,
          internalUsage: data.realUsages
        };
        classification.summary.quarantine++;
        return;
      }
      
      // Safe to drop
      classification.classifications[funcName] = {
        classification: CLASSIFICATIONS.DROP,
        reason: 'No usage found - safe to remove',
        usage: data.externalUsage,
        internalUsage: data.realUsages
      };
      classification.summary.drop++;
    }
  });
  
  return classification;
}

function generateRecommendations(classification) {
  const recommendations = [];
  
  // KEEP recommendations
  const keepItems = Object.entries(classification.classifications)
    .filter(([_, data]) => data.classification === 'KEEP')
    .map(([func, _]) => func);
  
  if (keepItems.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      action: 'KEEP',
      description: `Keep ${keepItems.length} functions that are actively used`,
      items: keepItems,
      nextSteps: [
        'Ensure these functions have proper test coverage',
        'Document their usage patterns',
        'Monitor for performance issues'
      ]
    });
  }
  
  // QUARANTINE recommendations
  const quarantineItems = Object.entries(classification.classifications)
    .filter(([_, data]) => data.classification === 'QUARANTINE')
    .map(([func, _]) => func);
  
  if (quarantineItems.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      action: 'QUARANTINE',
      description: `Move ${quarantineItems.length} functions to experimental folder`,
      items: quarantineItems,
      nextSteps: [
        'Create src/_experimental/ folder',
        'Move functions there with proper imports',
        'Keep proxies in main service for compatibility',
        'Monitor if they become needed in future'
      ]
    });
  }
  
  // INTERNAL recommendations
  const internalItems = Object.entries(classification.classifications)
    .filter(([_, data]) => data.classification === 'INTERNAL')
    .map(([func, _]) => func);
  
  if (internalItems.length > 0) {
    recommendations.push({
      priority: 'LOW',
      action: 'INTERNAL',
      description: `Keep ${internalItems.length} functions internal to ActivityTrackingService`,
      items: internalItems,
      nextSteps: [
        'Do not export these functions from barrel',
        'Keep them as private implementation details',
        'Consider making them truly private in future refactor'
      ]
    });
  }
  
  // DROP recommendations
  const dropItems = Object.entries(classification.classifications)
    .filter(([_, data]) => data.classification === 'DROP')
    .map(([func, _]) => func);
  
  if (dropItems.length > 0) {
    recommendations.push({
      priority: 'LOW',
      action: 'DROP',
      description: `Remove ${dropItems.length} unused functions`,
      items: dropItems,
      nextSteps: [
        'Remove function definitions',
        'Clean up any references',
        'Update tests if needed'
      ]
    });
  }
  
  return recommendations;
}

// Generate the classification report
const classification = classifyFunctions();
const recommendations = generateRecommendations(classification);

const finalReport = {
  ...classification,
  recommendations: recommendations,
  metadata: {
    basedOn: 'Static analysis + Kimi K2 findings',
    confidence: 'HIGH',
    nextSteps: [
      'Run telemetry to verify runtime usage',
      'Implement quarantine phase',
      'Test thoroughly after changes',
      'Monitor for regressions'
    ]
  }
};

// Save the report
const reportPath = path.join(REPORTS_DIR, 'classification-report.json');
fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));

// Print summary
console.log('=== CLASSIFICATION SUMMARY ===');
console.log(`📊 Total functions analyzed: ${finalReport.summary.total}`);
console.log(`✅ KEEP: ${finalReport.summary.keep} functions`);
console.log(`🔧 INTERNAL: ${finalReport.summary.internal} functions`);
console.log(`📦 QUARANTINE: ${finalReport.summary.quarantine} functions`);
console.log(`🗑️  DROP: ${finalReport.summary.drop} functions`);

console.log('\n=== RECOMMENDATIONS ===');
recommendations.forEach(rec => {
  console.log(`\n[${rec.priority}] ${rec.action}: ${rec.description}`);
  console.log(`   Items: ${rec.items.join(', ')}`);
  console.log(`   Next steps: ${rec.nextSteps.join('; ')}`);
});

console.log(`\n📁 Full report saved: ${reportPath}`);

// Helper variables for easy access
const quarantineItems = Object.entries(classification.classifications)
  .filter(([_, data]) => data.classification === 'QUARANTINE')
  .map(([func, _]) => func);

const dropItems = Object.entries(classification.classifications)
  .filter(([_, data]) => data.classification === 'DROP')
  .map(([func, _]) => func);

// Export for next steps
module.exports = { 
  classification, 
  recommendations, 
  actionableQuarantine: quarantineItems,
  actionableDrop: dropItems 
}; 