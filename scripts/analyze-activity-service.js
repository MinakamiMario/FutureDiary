// scripts/analyze-activity-service.js
// Deep analysis of ActivityTrackingService and related files
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'src');
const REPORTS_DIR = path.join(__dirname, 'reports');

// Create reports directory
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Files to analyze
const TARGET_FILES = [
  'services/data/ActivityTrackingService.js',
  'services/healthDataService.js',
  'services/locationService.js',
  'services/activityService.js'
];

console.log('🔍 Deep analysis of Activity Tracking Service consolidation...\n');

function analyzeFile(filePath) {
  const fullPath = path.join(SRC, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return null;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  
  const analysis = {
    file: filePath,
    totalLines: lines.length,
    exports: [],
    functions: [],
    classes: [],
    constants: [],
    imports: [],
    patterns: {
      formatFunctions: [],
      calculateFunctions: [],
      detectFunctions: [],
      extractFunctions: [],
      mockFunctions: [],
      utilityFunctions: []
    }
  };
  
  // Extract exports
  const exportMatches = content.match(/export\s+(?:default\s+)?(?:function|class|const|let|var)?\s*(\w+)/g);
  if (exportMatches) {
    analysis.exports = exportMatches.map(match => {
      return match.replace(/export\s+(?:default\s+)?(?:function|class|const|let|var)?\s*/, '');
    });
  }
  
  // Find function declarations
  const functionMatches = content.match(/(?:export\s+)?function\s+(\w+)\s*\(/g);
  if (functionMatches) {
    analysis.functions = functionMatches.map(match => {
      return match.replace(/(?:export\s+)?function\s+/, '').replace(/\s*\($/, '');
    });
  }
  
  // Find class declarations
  const classMatches = content.match(/(?:export\s+)?class\s+(\w+)/g);
  if (classMatches) {
    analysis.classes = classMatches.map(match => {
      return match.replace(/(?:export\s+)?class\s+/, '');
    });
  }
  
  // Find const declarations
  const constMatches = content.match(/(?:export\s+)?const\s+(\w+)\s*=/g);
  if (constMatches) {
    analysis.constants = constMatches.map(match => {
      return match.replace(/(?:export\s+)?const\s+/, '').replace(/\s*=$/, '');
    });
  }
  
  // Pattern-based analysis
  analysis.patterns.formatFunctions = analysis.functions.filter(name => /^format/.test(name));
  analysis.patterns.calculateFunctions = analysis.functions.filter(name => /^calculate/.test(name));
  analysis.patterns.detectFunctions = analysis.functions.filter(name => /^detect/.test(name));
  analysis.patterns.extractFunctions = analysis.functions.filter(name => /^extract/.test(name));
  analysis.patterns.mockFunctions = analysis.functions.filter(name => /mock/i.test(name));
  analysis.patterns.utilityFunctions = analysis.functions.filter(name => 
    /^format|^calculate|^detect|^extract|^mock|^classify|^validate|^transform/.test(name)
  );
  
  // Find imports
  const importMatches = content.match(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
  if (importMatches) {
    analysis.imports = importMatches.map(match => {
      const fromMatch = match.match(/from\s+['"]([^'"]+)['"]/);
      return fromMatch ? fromMatch[1] : 'unknown';
    });
  }
  
  return analysis;
}

function findUsageInCodebase(functionName, excludeFiles = []) {
  const results = [];
  
  function searchInFile(filePath) {
    if (excludeFiles.some(exclude => filePath.includes(exclude))) return;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        if (line.includes(functionName) && !line.includes('function') && !line.includes('export')) {
          results.push({
            file: path.relative(SRC, filePath),
            line: index + 1,
            content: line.trim()
          });
        }
      });
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  function searchDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.includes('node_modules') && !item.startsWith('.')) {
        searchDirectory(fullPath);
      } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.jsx') || item.endsWith('.ts') || item.endsWith('.tsx'))) {
        searchInFile(fullPath);
      }
    });
  }
  
  searchDirectory(SRC);
  return results;
}

// Main analysis
const allAnalysis = [];

TARGET_FILES.forEach(filePath => {
  console.log(`\n📁 Analyzing: ${filePath}`);
  
  const analysis = analyzeFile(filePath);
  if (analysis) {
    allAnalysis.push(analysis);
    
    console.log(`   📊 Lines: ${analysis.totalLines}`);
    console.log(`   🔧 Functions: ${analysis.functions.length}`);
    console.log(`   🏗️  Classes: ${analysis.classes.length}`);
    console.log(`   📦 Constants: ${analysis.constants.length}`);
    console.log(`   📤 Exports: ${analysis.exports.length}`);
    
    // Check for utility functions
    const utilityCount = analysis.patterns.utilityFunctions.length;
    if (utilityCount > 0) {
      console.log(`   ⚠️  Utility functions: ${utilityCount}`);
      console.log(`      - Format: ${analysis.patterns.formatFunctions.length}`);
      console.log(`      - Calculate: ${analysis.patterns.calculateFunctions.length}`);
      console.log(`      - Detect: ${analysis.patterns.detectFunctions.length}`);
      console.log(`      - Extract: ${analysis.patterns.extractFunctions.length}`);
      console.log(`      - Mock: ${analysis.patterns.mockFunctions.length}`);
    }
    
    // Find usage for utility functions
    if (analysis.patterns.utilityFunctions.length > 0) {
      console.log(`   🔍 Checking usage of utility functions...`);
      analysis.patterns.utilityFunctions.forEach(funcName => {
        const usage = findUsageInCodebase(funcName, [filePath]);
        if (usage.length === 0) {
          console.log(`      ❌ ${funcName} - NO USAGE FOUND`);
        } else {
          console.log(`      ✅ ${funcName} - Used in ${usage.length} places`);
        }
      });
    }
  }
});

// Generate comprehensive report
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalFiles: allAnalysis.length,
    totalLines: allAnalysis.reduce((sum, a) => sum + a.totalLines, 0),
    totalFunctions: allAnalysis.reduce((sum, a) => sum + a.functions.length, 0),
    totalUtilityFunctions: allAnalysis.reduce((sum, a) => sum + a.patterns.utilityFunctions.length, 0),
    totalClasses: allAnalysis.reduce((sum, a) => sum + a.classes.length, 0),
    totalExports: allAnalysis.reduce((sum, a) => sum + a.exports.length, 0)
  },
  files: allAnalysis,
  suspiciousPatterns: {
    formatFunctions: [],
    calculateFunctions: [],
    detectFunctions: [],
    extractFunctions: [],
    mockFunctions: []
  }
};

// Collect all suspicious functions
allAnalysis.forEach(analysis => {
  report.suspiciousPatterns.formatFunctions.push(...analysis.patterns.formatFunctions);
  report.suspiciousPatterns.calculateFunctions.push(...analysis.patterns.calculateFunctions);
  report.suspiciousPatterns.detectFunctions.push(...analysis.patterns.detectFunctions);
  report.suspiciousPatterns.extractFunctions.push(...analysis.patterns.extractFunctions);
  report.suspiciousPatterns.mockFunctions.push(...analysis.patterns.mockFunctions);
});

// Save report
const reportPath = path.join(REPORTS_DIR, 'activity-service-analysis.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log('\n=== ANALYSIS COMPLETE ===');
console.log(`📊 Total files analyzed: ${report.summary.totalFiles}`);
console.log(`📏 Total lines: ${report.summary.totalLines}`);
console.log(`🔧 Total functions: ${report.summary.totalFunctions}`);
console.log(`⚠️  Utility functions: ${report.summary.totalUtilityFunctions}`);
console.log(`🏗️  Classes: ${report.summary.totalClasses}`);
console.log(`📤 Exports: ${report.summary.totalExports}`);

console.log('\n🚨 Suspicious patterns found:');
console.log(`   Format functions: ${report.suspiciousPatterns.formatFunctions.length}`);
console.log(`   Calculate functions: ${report.suspiciousPatterns.calculateFunctions.length}`);
console.log(`   Detect functions: ${report.suspiciousPatterns.detectFunctions.length}`);
console.log(`   Extract functions: ${report.suspiciousPatterns.extractFunctions.length}`);
console.log(`   Mock functions: ${report.suspiciousPatterns.mockFunctions.length}`);

console.log(`\n📁 Report saved: ${reportPath}`);

// Return for next steps
module.exports = { report, allAnalysis };