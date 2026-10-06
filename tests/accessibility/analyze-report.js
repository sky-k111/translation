#!/usr/bin/env node

/**
 * Analyze Lighthouse Report
 * Extracts detailed information about failed audits
 */

const fs = require('fs');
const path = require('path');

const reportsDir = path.join(__dirname, 'reports');

// Find latest report
const reports = fs.readdirSync(reportsDir)
  .filter(f => f.startsWith('lighthouse-') && f.endsWith('.html'))
  .sort()
  .reverse();

if (reports.length === 0) {
  console.log('❌ No reports found');
  process.exit(1);
}

const latestReport = path.join(reportsDir, reports[0]);
console.log(`📊 Analyzing: ${reports[0]}\n`);

// Read and parse HTML report
const html = fs.readFileSync(latestReport, 'utf8');

// Extract JSON data from HTML (Lighthouse embeds JSON in script tag)
const jsonMatch = html.match(/window\.__LIGHTHOUSE_JSON__ = ({.*?});/s);

if (!jsonMatch) {
  console.log('⚠️  Could not parse report data');
  console.log('Please open the HTML report manually to view details');
  process.exit(1);
}

const lhr = JSON.parse(jsonMatch[1]);
const accessibilityCategory = lhr.categories.accessibility;
const score = (accessibilityCategory.score * 100).toFixed(1);

console.log('═══════════════════════════════════════════════════════');
console.log('           LIGHTHOUSE ACCESSIBILITY REPORT             ');
console.log('═══════════════════════════════════════════════════════\n');

// Score
const emoji = score >= 90 ? '🟢' : score >= 50 ? '🟠' : '🔴';
console.log(`${emoji} Score: ${score} / 100\n`);

// Count audits
const auditRefs = accessibilityCategory.auditRefs;
const passed = auditRefs.filter(ref => {
  const audit = lhr.audits[ref.id];
  return audit.score === 1;
}).length;

const failed = auditRefs.filter(ref => {
  const audit = lhr.audits[ref.id];
  return audit.score !== null && audit.score < 1;
}).length;

const notApplicable = auditRefs.filter(ref => {
  const audit = lhr.audits[ref.id];
  return audit.score === null;
}).length;

console.log(`✅ Passed: ${passed} audits`);
console.log(`❌ Failed: ${failed} audits`);
console.log(`⚪ Not Applicable: ${notApplicable} audits\n`);

// Failed audits details
const failedAudits = auditRefs
  .filter(ref => {
    const audit = lhr.audits[ref.id];
    return audit.score !== null && audit.score < 1;
  })
  .map(ref => {
    const audit = lhr.audits[ref.id];
    return {
      id: ref.id,
      title: audit.title,
      description: audit.description,
      score: audit.score,
      displayValue: audit.displayValue,
      details: audit.details
    };
  });

if (failedAudits.length > 0) {
  console.log('═══════════════════════════════════════════════════════');
  console.log('                    FAILED AUDITS                      ');
  console.log('═══════════════════════════════════════════════════════\n');

  failedAudits.forEach((audit, index) => {
    console.log(`${index + 1}. ❌ ${audit.title}`);
    console.log(`   ID: ${audit.id}`);
    if (audit.displayValue) {
      console.log(`   Value: ${audit.displayValue}`);
    }
    
    // Clean description (remove HTML tags)
    const cleanDesc = audit.description.replace(/<[^>]*>/g, '');
    console.log(`   ${cleanDesc}`);
    
    // Show affected elements if available
    if (audit.details && audit.details.items && audit.details.items.length > 0) {
      console.log(`   Affected elements: ${audit.details.items.length}`);
      
      // Show first few items
      audit.details.items.slice(0, 3).forEach((item, i) => {
        if (item.node) {
          console.log(`     ${i + 1}. ${item.node.snippet || item.node.selector || 'Element'}`);
        }
      });
      
      if (audit.details.items.length > 3) {
        console.log(`     ... and ${audit.details.items.length - 3} more`);
      }
    }
    
    console.log('');
  });
}

// Recommendations
console.log('═══════════════════════════════════════════════════════');
console.log('                   RECOMMENDATIONS                     ');
console.log('═══════════════════════════════════════════════════════\n');

if (score >= 95) {
  console.log('🎉 Excellent! Your accessibility score meets the target.\n');
  console.log('Recommended next steps:');
  console.log('  • Test with real screen readers (NVDA, VoiceOver, JAWS)');
  console.log('  • Perform manual keyboard-only testing');
  console.log('  • Document accessibility features');
  console.log('  • Set up continuous accessibility monitoring');
} else {
  console.log(`⚠️  Score is ${(95 - score).toFixed(1)} points below target of 95.\n`);
  console.log('Priority fixes:');
  
  // Suggest fixes based on common issues
  const issueTypes = {
    'color-contrast': 'Improve color contrast ratios (WCAG AA: 4.5:1 for normal text)',
    'button-name': 'Add accessible names to buttons (aria-label or text content)',
    'link-name': 'Add accessible names to links',
    'image-alt': 'Add alt text to images',
    'label': 'Associate form labels with inputs',
    'aria-': 'Fix ARIA attribute usage',
    'heading-order': 'Use proper heading hierarchy (h1, h2, h3)',
    'list': 'Use proper list markup (ul, ol, li)',
    'meta-viewport': 'Add proper viewport meta tag',
    'document-title': 'Add descriptive page title'
  };
  
  let priorityCount = 1;
  for (const [key, fix] of Object.entries(issueTypes)) {
    const hasIssue = failedAudits.some(audit => audit.id.includes(key));
    if (hasIssue) {
      console.log(`  ${priorityCount}. ${fix}`);
      priorityCount++;
    }
  }
  
  console.log('\nAfter fixing, re-run the audit:');
  console.log('  ./run-lighthouse-with-server.sh');
}

console.log('\n═══════════════════════════════════════════════════════\n');

// Save summary
const summaryPath = path.join(reportsDir, 'latest-summary.txt');
const summary = `
Lighthouse Accessibility Audit Summary
======================================

Date: ${new Date().toLocaleString()}
Score: ${score} / 100 ${emoji}
Target: 95

Results:
- Passed: ${passed} audits
- Failed: ${failed} audits
- Not Applicable: ${notApplicable} audits

Failed Audits:
${failedAudits.map((a, i) => `${i + 1}. ${a.title} (${a.id})`).join('\n')}

Full report: ${latestReport}
`;

fs.writeFileSync(summaryPath, summary);
console.log(`📝 Summary saved to: ${summaryPath}\n`);

process.exit(score >= 95 ? 0 : 1);
