// scripts/integrate-telemetry.js
// This script integrates telemetry tracking into service proxies
const fs = require('fs');
const path = require('path');

const services = [
  'src/services/healthDataService.js',
  'src/services/locationService.js', 
  'src/services/data/ActivityTrackingService.js'
];

function integrateTelemetry(servicePath) {
  if (!fs.existsSync(servicePath)) {
    console.log(`⚠️  Service not found: ${servicePath}`);
    return;
  }

  const content = fs.readFileSync(servicePath, 'utf8');
  
  // Check if telemetry is already integrated
  if (content.includes('trackExports') || content.includes('__SERVICE_CALLS__')) {
    console.log(`ℹ️  Telemetry already integrated: ${servicePath}`);
    return;
  }

  // Add telemetry import at the top
  const telemetryImport = `import { trackExports } from '../utils/instrumentation/trackService';\n`;
  
  // Find the export statement
  const exportMatch = content.match(/export default\s+([^;]+);?/);
  if (!exportMatch) {
    console.log(`⚠️  Could not find export statement in: ${servicePath}`);
    return;
  }

  const exportedObject = exportMatch[1].trim();
  const serviceName = path.basename(servicePath, '.js');

  // Create new content with telemetry integration
  const newContent = content.replace(
    /export default\s+([^;]+);?/,
    `const ${exportedObject}Tracked = trackExports(${exportedObject}, '${serviceName}');\nexport default __DEV__ ? ${exportedObject}Tracked : ${exportedObject};`
  );

  // Add telemetry import at the top if not already present
  const finalContent = telemetryImport + newContent;

  // Backup original file
  const backupPath = `${servicePath}.backup`;
  fs.writeFileSync(backupPath, content);
  
  // Write new content
  fs.writeFileSync(servicePath, finalContent);
  
  console.log(`✅ Telemetry integrated: ${servicePath}`);
  console.log(`📁 Backup saved: ${backupPath}`);
}

// Main execution
console.log('🔧 Integrating telemetry tracking into services...\n');

services.forEach(service => {
  integrateTelemetry(service);
});

console.log('\n🎯 Next steps:');
console.log('1. Run your app in development mode');
console.log('2. Test all relevant flows (settings, sync, dashboard, background)');
console.log('3. Call dumpServiceCalls() in console to get usage data');
console.log('4. Compare with AST analysis results');
console.log('5. Use classification system to decide KEEP/WIRE/QUARANTINE/DROP');