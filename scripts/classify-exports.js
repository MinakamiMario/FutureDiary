// scripts/classify-exports.js
// Classification system for exports based on usage analysis
const fs = require('fs');
const path = require('path');

const CLASSIFICATIONS = {
  KEEP: 'KEEP',      // Used and essential for v1
  WIRE: 'WIRE',      // Should be used but missing call-site
  QUARANTINE: 'QUARANTINE', // Not needed for v1 - move to experimental
  DROP: 'DROP'       // Clearly unused/redundant - remove
};

// Essential functions that should always be kept (core business logic)
const ESSENTIAL_FUNCTIONS = [
  // Health Data Service essentials
  'isAvailable',
  'requestPermissions', 
  'openHealthConnectSettings',
  'openHealthConnectPermissions',
  'openHealthConnectInPlayStore',
  'importHealthData',
  
  // Location Service essentials  
  'getCurrentLocation',
  'startLocationTracking',
  'stopLocationTracking',
  'requestLocationPermission',
  
  // Activity Tracking essentials
  'startTracking',
  'stopTracking',
  'getCurrentActivity',
  'getActivityHistory'
];

// Functions that are likely utility/internal and can be quarantined
const UTILITY_PATTERNS = [
  /^format.*Records$/,
  /^calculate.*Pattern$/,
  /^extract.*Features$/,
  /^classify.*Activity$/,
  /^detect.*Steps$/,
  /^getMock.*$/,
  /^.*HealthScore$/
];

function classifyExport(exportName, moduleName, usageData, runtimeData = {}) {
  const astUsed = usageData.used.includes(exportName);
  const runtimeUsed = runtimeData[exportName] > 0;
  const isEssential = ESSENTIAL_FUNCTIONS.includes(exportName);
  const isUtility = UTILITY_PATTERNS.some(pattern => pattern.test(exportName));
  
  // Decision tree
  if (isEssential) {
    return astUsed ? CLASSIFICATIONS.KEEP : CLASSIFICATIONS.WIRE;
  }
  
  if (astUsed || runtimeUsed) {
    return CLASSIFICATIONS.KEEP;
  }
  
  if (isUtility) {
    return CLASSIFICATIONS.QUARANTINE;
  }
  
  // Default to QUARANTINE for safety, manual review needed
  return CLASSIFICATIONS.QUARANTINE;
}

function generateClassificationReport(astReportPath, runtimeDataPath = null) {
  console.log('📊 Generating classification report...\n');
  
  // Load AST analysis report
  if (!fs.existsSync(astReportPath)) {
    console.error(`❌ AST report not found: ${astReportPath}`);
    return;
  }
  
  const astReport = JSON.parse(fs.readFileSync(astReportPath, 'utf8'));
  
  // Load runtime data if available
  let runtimeData = {};
  if (runtimeDataPath && fs.existsSync(runtimeDataPath)) {
    runtimeData = JSON.parse(fs.readFileSync(runtimeDataPath, 'utf8'));
    console.log('✅ Runtime data loaded');
  } else {
    console.log('⚠️  No runtime data available - using AST only');
  }
  
  const classificationReport = {
    summary: {
      totalExports: 0,
      keep: 0,
      wire: 0, 
      quarantine: 0,
      drop: 0
    },
    classifications: {},
    recommendations: []
  };
  
  // Classify each export
  astReport.forEach(moduleReport => {
    const { module, exports, used } = moduleReport;
    const moduleName = path.basename(module, '.js');
    
    classificationReport.classifications[module] = {
      module: moduleName,
      exports: {}
    };
    
    exports.forEach(exportName => {
      const runtimeUsage = runtimeData[moduleName]?.[exportName] || 0;
      const classification = classifyExport(exportName, moduleName, { used }, { [exportName]: runtimeUsage });
      
      classificationReport.classifications[module].exports[exportName] = {
        classification,
        astUsed: used.includes(exportName),
        runtimeUsed: runtimeUsage > 0,
        runtimeCalls: runtimeUsage
      };
      
      classificationReport.summary.totalExports++;
      classificationReport.summary[classification.toLowerCase()]++;
    });
  });
  
  // Generate recommendations
  const recommendations = [];
  
  if (classificationReport.summary.wire > 0) {
    recommendations.push({
      type: 'WIRE',
      priority: 'HIGH',
      description: `${classificationReport.summary.wire} essential functions are not being used - check if integrations are missing`,
      action: 'Review and implement missing call-sites for essential functions'
    });
  }
  
  if (classificationReport.summary.quarantine > 0) {
    recommendations.push({
      type: 'QUARANTINE', 
      priority: 'MEDIUM',
      description: `${classificationReport.summary.quarantine} functions can be moved to experimental folder`,
      action: 'Move quarantined functions to src/_experimental/ for future evaluation'
    });
  }
  
  if (classificationReport.summary.keep > 0) {
    recommendations.push({
      type: 'KEEP',
      priority: 'LOW', 
      description: `${classificationReport.summary.keep} functions are actively used - ensure they have proper test coverage`,
      action: 'Add unit tests for kept functions to prevent future regressions'
    });
  }
  
  classificationReport.recommendations = recommendations;
  
  // Save report
  const reportPath = path.join(__dirname, 'classification-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(classificationReport, null, 2));
  
  // Print summary
  console.log('=== CLASSIFICATION SUMMARY ===');
  console.log(`📈 Total exports analyzed: ${classificationReport.summary.totalExports}`);
  console.log(`✅ KEEP: ${classificationReport.summary.keep}`);
  console.log(`🔧 WIRE: ${classificationReport.summary.wire}`);
  console.log(`📦 QUARANTINE: ${classificationReport.summary.quarantine}`);
  console.log(`🗑️  DROP: ${classificationReport.summary.drop}`);
  console.log('\n=== RECOMMENDATIONS ===');
  recommendations.forEach(rec => {
    console.log(`[${rec.priority}] ${rec.type}: ${rec.description}`);
    console.log(`  → ${rec.action}`);
  });
  
  console.log(`\n📁 Full report saved to: ${reportPath}`);
  
  return classificationReport;
}

// CLI usage
if (require.main === module) {
  const astReportPath = process.argv[2] || path.join(__dirname, 'unused-exports-report.json');
  const runtimeDataPath = process.argv[3] || null;
  
  generateClassificationReport(astReportPath, runtimeDataPath);
}

module.exports = { generateClassificationReport, CLASSIFICATIONS };