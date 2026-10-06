#!/usr/bin/env node

/**
 * Lighthouse Accessibility Audit Script
 * 
 * This script runs Lighthouse accessibility audits on the WordDrawerV2 component
 * and generates detailed reports.
 * 
 * Usage:
 *   node tests/accessibility/run-lighthouse.js
 * 
 * Requirements:
 *   - lighthouse (npm install -g lighthouse)
 *   - Chrome browser
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  testPagePath: path.resolve(__dirname, 'lighthouse-test.html'),
  outputDir: path.resolve(__dirname, 'reports'),
  targetScore: 95,
  categories: ['accessibility'],
  
  lighthouseConfig: {
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: ['accessibility'],
      formFactor: 'desktop',
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false,
      },
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
      },
    },
  },
};

/**
 * Ensure output directory exists
 */
function ensureOutputDir() {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    console.log(`✓ Created output directory: ${CONFIG.outputDir}`);
  }
}

/**
 * Launch Chrome and run Lighthouse
 */
async function runLighthouse() {
  console.log('\n🚀 Starting Lighthouse Accessibility Audit...\n');
  
  // Convert file path to file:// URL
  const testUrl = `file://${CONFIG.testPagePath}`;
  console.log(`📄 Test page: ${testUrl}`);
  
  let chrome;
  
  try {
    // Launch Chrome
    console.log('🌐 Launching Chrome...');
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--disable-gpu'],
    });
    
    console.log(`✓ Chrome launched on port ${chrome.port}`);
    
    // Run Lighthouse
    console.log('\n🔍 Running Lighthouse audit...');
    const runnerResult = await lighthouse(
      testUrl,
      {
        port: chrome.port,
        output: ['html', 'json'],
      },
      CONFIG.lighthouseConfig
    );
    
    // Extract results
    const { lhr, report } = runnerResult;
    const accessibilityScore = lhr.categories.accessibility.score * 100;
    
    // Save reports
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const htmlPath = path.join(CONFIG.outputDir, `lighthouse-${timestamp}.html`);
    const jsonPath = path.join(CONFIG.outputDir, `lighthouse-${timestamp}.json`);
    
    fs.writeFileSync(htmlPath, report[0]);
    fs.writeFileSync(jsonPath, report[1]);
    
    console.log('\n✅ Audit complete!\n');
    
    // Display results
    displayResults(lhr, accessibilityScore);
    
    // Save summary
    saveSummary(lhr, accessibilityScore, timestamp);
    
    console.log(`\n📊 Full reports saved:`);
    console.log(`   HTML: ${htmlPath}`);
    console.log(`   JSON: ${jsonPath}`);
    
    // Check if target score is met
    if (accessibilityScore >= CONFIG.targetScore) {
      console.log(`\n🎉 SUCCESS! Score ${accessibilityScore} meets target of ${CONFIG.targetScore}`);
      process.exit(0);
    } else {
      console.log(`\n⚠️  WARNING: Score ${accessibilityScore} is below target of ${CONFIG.targetScore}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error running Lighthouse:', error);
    process.exit(1);
  } finally {
    if (chrome) {
      await chrome.kill();
      console.log('\n🔚 Chrome closed');
    }
  }
}

/**
 * Display audit results in console
 */
function displayResults(lhr, score) {
  console.log('═══════════════════════════════════════════════════════');
  console.log('                 ACCESSIBILITY SCORE                   ');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\n   ${getScoreEmoji(score)} ${score.toFixed(1)} / 100\n`);
  console.log('═══════════════════════════════════════════════════════');
  
  // Display audit details
  const audits = lhr.categories.accessibility.auditRefs;
  const failedAudits = audits.filter(ref => {
    const audit = lhr.audits[ref.id];
    return audit.score !== null && audit.score < 1;
  });
  
  const passedAudits = audits.filter(ref => {
    const audit = lhr.audits[ref.id];
    return audit.score === 1;
  });
  
  console.log(`\n✅ Passed: ${passedAudits.length} audits`);
  console.log(`❌ Failed: ${failedAudits.length} audits`);
  
  if (failedAudits.length > 0) {
    console.log('\n📋 Failed Audits:\n');
    failedAudits.forEach(ref => {
      const audit = lhr.audits[ref.id];
      console.log(`   ❌ ${audit.title}`);
      if (audit.description) {
        console.log(`      ${audit.description.replace(/<[^>]*>/g, '')}`);
      }
      console.log('');
    });
  }
  
  // Display opportunities
  const opportunities = audits.filter(ref => {
    const audit = lhr.audits[ref.id];
    return audit.score !== null && audit.score < 1 && audit.details;
  });
  
  if (opportunities.length > 0) {
    console.log('\n💡 Improvement Opportunities:\n');
    opportunities.slice(0, 5).forEach(ref => {
      const audit = lhr.audits[ref.id];
      console.log(`   • ${audit.title}`);
    });
  }
}

/**
 * Get emoji based on score
 */
function getScoreEmoji(score) {
  if (score >= 90) return '🟢';
  if (score >= 50) return '🟠';
  return '🔴';
}

/**
 * Save summary to markdown file
 */
function saveSummary(lhr, score, timestamp) {
  const summaryPath = path.join(CONFIG.outputDir, 'lighthouse-summary.md');
  
  const summary = `# Lighthouse Accessibility Audit Summary

**Date**: ${new Date().toLocaleString()}
**Score**: ${score.toFixed(1)} / 100 ${getScoreEmoji(score)}
**Target**: ${CONFIG.targetScore}
**Status**: ${score >= CONFIG.targetScore ? '✅ PASSED' : '⚠️ NEEDS IMPROVEMENT'}

## Score Breakdown

| Category | Score |
|----------|-------|
| Accessibility | ${score.toFixed(1)} |

## Audit Results

- ✅ Passed: ${lhr.categories.accessibility.auditRefs.filter(ref => lhr.audits[ref.id].score === 1).length} audits
- ❌ Failed: ${lhr.categories.accessibility.auditRefs.filter(ref => {
    const audit = lhr.audits[ref.id];
    return audit.score !== null && audit.score < 1;
  }).length} audits

## Failed Audits

${lhr.categories.accessibility.auditRefs
  .filter(ref => {
    const audit = lhr.audits[ref.id];
    return audit.score !== null && audit.score < 1;
  })
  .map(ref => {
    const audit = lhr.audits[ref.id];
    return `### ❌ ${audit.title}\n\n${audit.description.replace(/<[^>]*>/g, '')}\n`;
  })
  .join('\n')}

## Next Steps

${score >= CONFIG.targetScore 
  ? '✅ Accessibility score meets the target! Continue monitoring and maintaining accessibility standards.'
  : `⚠️ Accessibility score is below target. Review failed audits above and implement fixes.`}

---

*Generated by Lighthouse ${lhr.lighthouseVersion} on ${timestamp}*
`;
  
  fs.writeFileSync(summaryPath, summary);
  console.log(`\n📝 Summary saved: ${summaryPath}`);
}

// Main execution
(async () => {
  ensureOutputDir();
  await runLighthouse();
})();
