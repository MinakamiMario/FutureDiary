// scripts/analyze-barrel-usage.js
// Analyze and fix direct service imports
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC = path.resolve(__dirname, '..', 'src');
const REPORTS_DIR = path.join(__dirname, 'reports');

if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

console.log('🔍 Analyzing direct service imports (bypassing barrel)...\n');

// Find all direct service imports
function findDirectServiceImports() {
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
          } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.jsx') || item.endsWith('.ts') || item.endsWith('.tsx'))) {
            
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // Look for direct service imports
            const importPattern = /import\s+.*?from\s+['"]\..*?services\/([^'"]+)['"]/g;
            let match;
            
            while ((match = importPattern.exec(content)) !== null) {
              const fullImport = match[0];
              const importedService = match[1];
              
              // Skip if already using barrel
              if (fullImport.includes('services/index') || fullImport.includes('services/"') || fullImport.includes("services/")) {
                continue;
              }
              
              // Find line number
              const lines = content.substring(0, match.index).split('\n');
              const lineNumber = lines.length;
              
              results.push({
                file: relativePath,
                line: lineNumber,
                importStatement: fullImport,
                service: importedService,
                servicePath: `services/${importedService}`
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
  
  walkDirectory(SRC);
  return results;
}

// Analyze the imports
const directImports = findDirectServiceImports();

console.log(`📊 Found ${directImports.length} direct service imports:\n`);

// Group by service
const byService = {};
directImports.forEach(item => {
  if (!byService[item.service]) {
    byService[item.service] = [];
  }
  byService[item.service].push(item);
});

Object.entries(byService).forEach(([service, imports]) => {
  console.log(`🔧 ${service} (${imports.length} imports):`);
  imports.slice(0, 3).forEach(item => {
    console.log(`   ${item.file}:${item.line}`);
  });
  if (imports.length > 3) {
    console.log(`   ... and ${imports.length - 3} more`);
  }
  console.log('');
});

// Generate migration suggestions
const migrationPlan = {
  timestamp: new Date().toISOString(),
  totalImports: directImports.length,
  byService: byService,
  suggestions: []
};

// Standard service mappings to barrel exports
const barrelMappings = {
  'healthDataService.js': 'healthDataService',
  'locationService.js': 'locationService', 
  'activityService.js': 'activityService',
  'errorLogger.js': 'ErrorReportingService',
  'performanceService.js': 'PerformanceService',
  'BaseService.js': 'BaseService',
  'database': 'DatabaseService', // This is a directory
  'securityService.js': 'SecurityService'
};

Object.entries(byService).forEach(([service, imports]) => {
  const barrelExport = barrelMappings[service];
  
  if (barrelExport) {
    migrationPlan.suggestions.push({
      service: service,
      currentImport: `import ... from '../services/${service}'`,
      suggestedImport: `import { ${barrelExport} } from '../services'`,
      filesToUpdate: imports.map(item => item.file),
      priority: imports.length > 5 ? 'HIGH' : imports.length > 2 ? 'MEDIUM' : 'LOW'
    });
  } else {
    migrationPlan.suggestions.push({
      service: service,
      currentImport: `import ... from '../services/${service}'`,
      suggestedImport: 'ADD TO BARREL FIRST',
      filesToUpdate: imports.map(item => item.file),
      priority: 'HIGH',
      note: 'This service is not exported from the barrel - needs to be added first'
    });
  }
});

console.log('\n=== MIGRATION PLAN ===\n');

migrationPlan.suggestions.forEach(suggestion => {
  console.log(`[${suggestion.priority}] ${suggestion.service}:`);
  console.log(`   From: ${suggestion.currentImport}`);
  console.log(`   To: ${suggestion.suggestedImport}`);
  console.log(`   Files: ${suggestion.filesToUpdate.length} files`);
  if (suggestion.note) {
    console.log(`   Note: ${suggestion.note}`);
  }
  console.log('');
});

// Save report
const reportPath = path.join(REPORTS_DIR, 'barrel-migration-plan.json');
fs.writeFileSync(reportPath, JSON.stringify(migrationPlan, null, 2));

console.log(`📁 Report saved: ${reportPath}`);

// Generate actionable list
const actionableItems = migrationPlan.suggestions
  .filter(s => s.priority === 'HIGH')
  .map(s => ({
    service: s.service,
    files: s.filesToUpdate.length,
    action: s.suggestedImport === 'ADD TO BARREL FIRST' ? 'ADD_TO_BARREL' : 'MIGRATE_IMPORTS'
  }));

console.log('\n🎯 HIGH PRIORITY ACTIONS:');
actionableItems.forEach(item => {
  console.log(`   - ${item.service}: ${item.files} files (${item.action})`);
});

module.exports = { migrationPlan, actionableItems, directImports };