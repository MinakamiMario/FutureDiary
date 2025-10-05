// scripts/find-unused-exports-simple.js
// Simplified version using grep for initial analysis
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC = path.resolve(__dirname, '..', 'src');
const REPORTS_DIR = path.join(__dirname, 'reports');

// Create reports directory
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Target modules for analysis
const TARGET_MODULES = [
  'services/data/ActivityTrackingService.js',
  'services/healthDataService.js',
  'services/locationService.js',
  'services/activityService.js'
];

console.log('🔍 Starting simplified unused exports analysis...\n');

// Function to find all exports in a file
function findExports(filePath) {
  const content = fs.readFileSync(path.join(SRC, filePath), 'utf8');
  const exports = [];
  
  // Find export function declarations
  const functionMatches = content.match(/export\s+function\s+(\w+)/g);
  if (functionMatches) {
    functionMatches.forEach(match => {
      const funcName = match.replace(/export\s+function\s+/, '');
      exports.push(funcName);
    });
  }
  
  // Find export const declarations  
  const constMatches = content.match(/export\s+const\s+(\w+)/g);
  if (constMatches) {
    constMatches.forEach(match => {
      const constName = match.replace(/export\s+const\s+/, '');
      exports.push(constName);
    });
  }
  
  // Find export { name } declarations
  const namedMatches = content.match(/export\s*{\s*([^}]+)\s*}/g);
  if (namedMatches) {
    namedMatches.forEach(match => {
      const names = match.replace(/export\s*{\s*|\s*}/g, '').split(',').map(n => n.trim());
      exports.push(...names);
    });
  }
  
  // Find export default
  if (content.includes('export default')) {
    exports.push('default');
  }
  
  return [...new Set(exports)]; // Remove duplicates
}

// Function to find usage of exports in codebase
function findUsage(exportName, modulePath) {
  try {
    // Search for direct imports from the module
    const importPattern = `from.*${modulePath.replace('.js', '')}`;
    const importResults = execSync(`grep -r "${importPattern}" ${SRC} --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" || true`, { encoding: 'utf8' });
    
    // Search for usage of the export name
    const usageResults = execSync(`grep -r "\\b${exportName}\\b" ${SRC} --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" || true`, { encoding: 'utf8' });
    
    const hasImports = importResults.trim().length > 0;
    const hasUsage = usageResults.trim().length > 0;
    
    return {
      hasImports,
      hasUsage,
      importLines: importResults.trim().split('\n').filter(line => line.length > 0),
      usageLines: usageResults.trim().split('\n').filter(line => line.length > 0)
    };
  } catch (error) {
    return { hasImports: false, hasUsage: false, importLines: [], usageLines: [] };
  }
}

// Main analysis
const analysisResults = [];

TARGET_MODULES.forEach(modulePath => {
  const fullPath = path.join(SRC, modulePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Module not found: ${modulePath}`);
    return;
  }
  
  console.log(`\n📁 Analyzing: ${modulePath}`);
  
  const exports = findExports(modulePath);
  console.log(`   Found ${exports.length} exports`);
  
  const moduleAnalysis = {
    module: modulePath,
    exports: exports,
    used: [],
    unused: [],
    details: {}
  };
  
  exports.forEach(exportName => {
    const usage = findUsage(exportName, modulePath);
    const isUsed = usage.hasUsage && usage.hasImports;
    
    if (isUsed) {
      moduleAnalysis.used.push(exportName);
    } else {
      moduleAnalysis.unused.push(exportName);
    }
    
    moduleAnalysis.details[exportName] = {
      used: isUsed,
      imports: usage.importLines.length,
      usages: usage.usageLines.length,
      importLines: usage.importLines.slice(0, 3), // First 3 for brevity
      usageLines: usage.usageLines.slice(0, 3)    // First 3 for brevity
    };
  });
  
  analysisResults.push(moduleAnalysis);
  
  console.log(`   ✅ Used: ${moduleAnalysis.used.length}`);
  console.log(`   ❌ Unused: ${moduleAnalysis.unused.length}`);
  
  if (moduleAnalysis.unused.length > 0) {
    console.log(`   🔍 Unused exports: ${moduleAnalysis.unused.join(', ')}`);
  }
});

// Generate summary report
const summaryReport = {
  timestamp: new Date().toISOString(),
  totalModules: analysisResults.length,
  totalExports: analysisResults.reduce((sum, mod) => sum + mod.exports.length, 0),
  totalUsed: analysisResults.reduce((sum, mod) => sum + mod.used.length, 0),
  totalUnused: analysisResults.reduce((sum, mod) => sum + mod.unused.length, 0),
  modules: analysisResults
};

// Save reports
const unusedReportPath = path.join(REPORTS_DIR, 'unused-exports-simple.json');
const detailedReportPath = path.join(REPORTS_DIR, 'detailed-analysis.json');

fs.writeFileSync(unusedReportPath, JSON.stringify({
  summary: {
    totalUnused: summaryReport.totalUnused,
    totalExports: summaryReport.totalExports,
    percentageUnused: Math.round((summaryReport.totalUnused / summaryReport.totalExports) * 100)
  },
  unusedByModule: analysisResults.map(mod => ({
    module: mod.module,
    unused: mod.unused
  }))
}, null, 2));

fs.writeFileSync(detailedReportPath, JSON.stringify(summaryReport, null, 2));

console.log('\n=== ANALYSIS COMPLETE ===');
console.log(`📊 Total exports analyzed: ${summaryReport.totalExports}`);
console.log(`✅ Used exports: ${summaryReport.totalUsed}`);
console.log(`❌ Unused exports: ${summaryReport.totalUnused}`);
console.log(`📈 Percentage unused: ${Math.round((summaryReport.totalUnused / summaryReport.totalExports) * 100)}%`);

console.log(`\n📁 Reports saved:`);
console.log(`   - Summary: ${unusedReportPath}`);
console.log(`   - Details: ${detailedReportPath}`);

// Return data for next steps
module.exports = { analysisResults, summaryReport };