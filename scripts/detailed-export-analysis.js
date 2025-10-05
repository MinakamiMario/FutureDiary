// scripts/detailed-export-analysis.js
// Deep dive into ActivityTrackingService exports and usage
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC = path.resolve(__dirname, '..', 'src');

console.log('🔍 Detailed export analysis of ActivityTrackingService...\n');

// Read the main file
const activityServicePath = path.join(SRC, 'services/data/ActivityTrackingService.js');
const content = fs.readFileSync(activityServicePath, 'utf8');

console.log('📄 File size:', content.length, 'characters');
console.log('📏 Line count:', content.split('\n').length);

// Find all class declarations and their methods
const classRegex = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{([^}]+)\}/gs;
const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{[^}]*\}/gs;
const methodRegex = /(\w+)\s*\([^)]*\)\s*\{[^}]*\}/gs;

const classes = [];
let classMatch;

while ((classMatch = classRegex.exec(content)) !== null) {
  const className = classMatch[1];
  const classBody = classMatch[2];
  
  console.log(`\n🏗️  Class found: ${className}`);
  
  // Find methods in class
  const methods = [];
  let methodMatch;
  
  // Reset regex for each class body
  const methodRegexLocal = /(\w+)\s*\([^)]*\)\s*\{/g;
  while ((methodMatch = methodRegexLocal.exec(classBody)) !== null) {
    const methodName = methodMatch[1];
    if (!['constructor', 'if', 'for', 'while', 'switch', 'try', 'catch', 'finally'].includes(methodName)) {
      methods.push(methodName);
    }
  }
  
  console.log(`   Methods (${methods.length}): ${methods.slice(0, 10).join(', ')}${methods.length > 10 ? '...' : ''}`);
  
  // Categorize methods
  const formatMethods = methods.filter(m => m.startsWith('format'));
  const calculateMethods = methods.filter(m => m.startsWith('calculate'));
  const detectMethods = methods.filter(m => m.startsWith('detect'));
  const extractMethods = methods.filter(m => m.startsWith('extract'));
  const classifyMethods = methods.filter(m => m.startsWith('classify'));
  const mockMethods = methods.filter(m => m.toLowerCase().includes('mock'));
  
  if (formatMethods.length > 0) console.log(`   📋 Format methods: ${formatMethods.join(', ')}`);
  if (calculateMethods.length > 0) console.log(`   🧮 Calculate methods: ${calculateMethods.join(', ')}`);
  if (detectMethods.length > 0) console.log(`   🔍 Detect methods: ${detectMethods.join(', ')}`);
  if (extractMethods.length > 0) console.log(`   🔧 Extract methods: ${extractMethods.join(', ')}`);
  if (classifyMethods.length > 0) console.log(`   🏷️  Classify methods: ${classifyMethods.join(', ')}`);
  if (mockMethods.length > 0) console.log(`   🎭 Mock methods: ${mockMethods.join(', ')}`);
  
  classes.push({
    name: className,
    methods: methods,
    formatMethods,
    calculateMethods,
    detectMethods,
    extractMethods,
    classifyMethods,
    mockMethods
  });
}

// Check for export at the end of file
const exportMatch = content.match(/export\s+default\s+(\w+)/);
if (exportMatch) {
  console.log(`\n📤 Export found: export default ${exportMatch[1]}`);
}

// Find standalone functions
const standaloneFunctions = [];
let funcMatch;
const standaloneRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g;

while ((funcMatch = standaloneRegex.exec(content)) !== null) {
  standaloneFunctions.push(funcMatch[1]);
}

if (standaloneFunctions.length > 0) {
  console.log(`\n🔧 Standalone functions: ${standaloneFunctions.join(', ')}`);
}

// Find all function calls to check usage
console.log('\n🔍 Checking usage patterns...');

// Look for specific patterns mentioned by Kimi
const suspiciousPatterns = [
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

suspiciousPatterns.forEach(pattern => {
  const regex = new RegExp(`\\b${pattern}\\b`, 'g');
  const matches = content.match(regex);
  const count = matches ? matches.length : 0;
  
  if (count > 0) {
    console.log(`   Found ${count} references to ${pattern}`);
    
    // Check if it's a function definition or usage
    const definitionMatch = content.match(new RegExp(`(?:export\s+)?(?:async\s+)?function\\s+${pattern}`, 'g'));
    const methodMatch = content.match(new RegExp(`${pattern}\\s*\\(`, 'g'));
    
    if (definitionMatch) {
      console.log(`      📋 Function definition found`);
    }
    if (methodMatch) {
      console.log(`      🔧 Function calls found: ${methodMatch.length}`);
    }
  }
});

// Generate usage report
console.log('\n📊 Summary by class:');
classes.forEach(cls => {
  console.log(`\n${cls.name}:`);
  console.log(`   Total methods: ${cls.methods.length}`);
  console.log(`   Utility methods: ${cls.formatMethods.length + cls.calculateMethods.length + cls.detectMethods.length + cls.extractMethods.length + cls.classifyMethods.length + cls.mockMethods.length}`);
  
  const hasUtilityMethods = cls.formatMethods.length > 0 || 
                           cls.calculateMethods.length > 0 || 
                           cls.detectMethods.length > 0 || 
                           cls.extractMethods.length > 0 || 
                           cls.classifyMethods.length > 0 || 
                           cls.mockMethods.length > 0;
  
  if (hasUtilityMethods) {
    console.log(`   ⚠️  Contains utility methods that may not be used`);
  }
});

// Save detailed analysis
const report = {
  timestamp: new Date().toISOString(),
  file: 'services/data/ActivityTrackingService.js',
  classes: classes,
  standaloneFunctions: standaloneFunctions,
  suspiciousPatterns: suspiciousPatterns.map(pattern => ({
    name: pattern,
    found: content.includes(pattern),
    references: (content.match(new RegExp(`\\b${pattern}\\b`, 'g')) || []).length
  })),
  summary: {
    totalClasses: classes.length,
    totalMethods: classes.reduce((sum, cls) => sum + cls.methods.length, 0),
    totalUtilityMethods: classes.reduce((sum, cls) => 
      sum + cls.formatMethods.length + cls.calculateMethods.length + cls.detectMethods.length + 
          cls.extractMethods.length + cls.classifyMethods.length + cls.mockMethods.length, 0)
  }
};

const reportPath = path.join(__dirname, 'reports', 'detailed-class-analysis.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n📁 Detailed report saved: ${reportPath}`);

// Return data
module.exports = { classes, suspiciousPatterns: report.suspiciousPatterns };