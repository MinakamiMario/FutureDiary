// scripts/ci-unused-check.js
// CI script to check for unused exports and fail build if critical issues found
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPORTS_DIR = path.join(__dirname, 'reports');
const CRITICAL_THRESHOLD = 5; // Fail CI if more than 5 essential functions are unused
const WARNING_THRESHOLD = 10; // Warn if more than 10 total unused functions

function runUnusedCheck() {
  console.log('🔍 Running unused exports check...\n');
  
  try {
    // Run AST analysis
    console.log('1️⃣ Running AST analysis...');
    execSync('node scripts/simple-usage-analysis.js', { stdio: 'inherit' });
    
    // Run classification
    console.log('\n2️⃣ Running classification analysis...');
    
    // First generate the report file
    execSync('node scripts/generate-classification.js', { stdio: 'inherit' });
    
    // Then read the generated report
    const classificationReport = JSON.parse(
      fs.readFileSync(path.join(REPORTS_DIR, 'classification-report.json'), 'utf8')
    );
    
    // Check thresholds
    const { summary, recommendations } = classificationReport;
    
    console.log('\n=== CI CHECK RESULTS ===');
    console.log(`📊 Total unused exports: ${summary.quarantine + summary.drop}`);
    console.log(`🔧 WIRE (missing integrations): ${summary.wire}`);
    console.log(`📦 QUARANTINE (safe to remove): ${summary.quarantine}`);
    console.log(`🗑️  DROP (definitely unused): ${summary.drop}`);
    
    // Check for critical issues
    if (summary.wire > CRITICAL_THRESHOLD) {
      console.error(`\n❌ CRITICAL: ${summary.wire} essential functions are not integrated!`);
      console.error('   This indicates missing integrations that could break core functionality.');
      process.exit(1);
    }
    
    if ((summary.quarantine + summary.drop) > WARNING_THRESHOLD) {
      console.warn(`\n⚠️  WARNING: ${summary.quarantine + summary.drop} unused exports detected.`);
      console.warn('   Consider cleaning up to reduce bundle size and maintenance burden.');
    }
    
    // Check for specific high-priority recommendations
    const criticalRecs = recommendations.filter(rec => rec.priority === 'HIGH');
    if (criticalRecs.length > 0) {
      console.error('\n❌ CRITICAL ISSUES FOUND:');
      criticalRecs.forEach(rec => {
        console.error(`   - ${rec.description}`);
      });
      process.exit(1);
    }
    
    console.log('\n✅ CI check passed! No critical unused export issues found.');
    
    // Generate summary for PR comments
    const summaryPath = path.join(__dirname, 'ci-unused-summary.md');
    const summaryContent = `## 🔍 Unused Exports Analysis

**Summary:**
- ✅ Total exports analyzed: ${summary.totalExports}
- 🔧 Essential functions needing integration: ${summary.wire}
- 📦 Functions safe to quarantine: ${summary.quarantine}  
- 🗑️ Functions ready for removal: ${summary.drop}

**Recommendations:**
${recommendations.map(rec => `- ${rec.type}: ${rec.description}`).join('\n')}

**Status:** ${summary.wire > CRITICAL_THRESHOLD ? '❌ FAILED' : '✅ PASSED'}
`;
    
    fs.writeFileSync(summaryPath, summaryContent);
    console.log(`\n📋 PR summary saved to: ${summaryPath}`);
    
  } catch (error) {
    console.error('\n❌ CI check failed:', error.message);
    process.exit(1);
  }
}

// Run the check
if (require.main === module) {
  runUnusedCheck();
}

module.exports = { runUnusedCheck };