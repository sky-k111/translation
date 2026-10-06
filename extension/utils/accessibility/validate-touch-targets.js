/**
 * Touch Target Validation Script
 * 
 * This script can be run in the browser console to validate
 * touch target sizes in the Word Drawer component.
 * 
 * Usage:
 * 1. Open the Word Drawer
 * 2. Open browser console
 * 3. Run: validateWordDrawerTouchTargets()
 */

(function() {
  // Load TouchTargetValidator if not already loaded
  if (typeof TouchTargetValidator === 'undefined') {
    console.error('TouchTargetValidator not loaded. Please ensure the module is available.');
    return;
  }

  /**
   * Validates touch targets in the Word Drawer
   */
  window.validateWordDrawerTouchTargets = function() {
    console.group('🎯 Word Drawer Touch Target Validation');
    
    // Find the word drawer element
    const drawer = document.querySelector('.word-drawer');
    
    if (!drawer) {
      console.error('❌ Word Drawer not found. Please open the drawer first.');
      console.groupEnd();
      return;
    }

    console.log('✓ Word Drawer found');
    
    // Run validation
    const report = TouchTargetValidator.generateTouchTargetReport(drawer);
    
    // Display results
    console.log('\n📊 Validation Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Interactive Elements: ${report.summary.totalElements}`);
    console.log(`Passed: ${report.summary.passedElements} ✓`);
    console.log(`Failed: ${report.summary.failedElements} ${report.summary.failedElements > 0 ? '✗' : '✓'}`);
    console.log(`Compliance Rate: ${report.summary.complianceRate}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (report.summary.passed) {
      console.log('\n✅ All touch targets meet WCAG 2.1 AA requirements!');
    } else {
      console.warn(`\n⚠️  ${report.summary.failedElements} element(s) failed validation:`);
      console.table(report.failures);
      
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }
    
    console.groupEnd();
    
    return report;
  };

  /**
   * Validates a specific element by selector
   */
  window.validateTouchTarget = function(selector) {
    const element = document.querySelector(selector);
    
    if (!element) {
      console.error(`Element not found: ${selector}`);
      return;
    }

    const result = TouchTargetValidator.validateTouchTarget(element);
    
    console.group(`🎯 Touch Target Validation: ${selector}`);
    console.log(`Valid: ${result.valid ? '✓' : '✗'}`);
    console.log(`Dimensions: ${result.width.toFixed(1)}x${result.height.toFixed(1)}px`);
    console.log(`Required: ${result.requiredWidth}x${result.requiredHeight}px`);
    
    if (!result.valid) {
      if (!result.meetsWidth) {
        console.warn(`Width deficit: ${(result.requiredWidth - result.width).toFixed(1)}px`);
      }
      if (!result.meetsHeight) {
        console.warn(`Height deficit: ${(result.requiredHeight - result.height).toFixed(1)}px`);
      }
    }
    
    console.groupEnd();
    
    return result;
  };

  /**
   * Highlights elements that fail touch target validation
   */
  window.highlightFailingTouchTargets = function() {
    const drawer = document.querySelector('.word-drawer');
    
    if (!drawer) {
      console.error('Word Drawer not found');
      return;
    }

    const validation = TouchTargetValidator.validateAllInteractiveElements(drawer);
    
    // Remove existing highlights
    document.querySelectorAll('.touch-target-highlight').forEach(el => {
      el.classList.remove('touch-target-highlight');
    });

    // Add highlights to failing elements
    validation.failures.forEach(failure => {
      failure.element.classList.add('touch-target-highlight');
      failure.element.style.outline = '2px dashed red';
      failure.element.style.outlineOffset = '2px';
    });

    console.log(`Highlighted ${validation.failures.length} failing elements`);
    
    return validation.failures;
  };

  /**
   * Removes touch target highlights
   */
  window.clearTouchTargetHighlights = function() {
    document.querySelectorAll('.touch-target-highlight').forEach(el => {
      el.classList.remove('touch-target-highlight');
      el.style.outline = '';
      el.style.outlineOffset = '';
    });
    
    console.log('Highlights cleared');
  };

  console.log('🎯 Touch Target Validation Tools Loaded');
  console.log('Available commands:');
  console.log('  - validateWordDrawerTouchTargets()');
  console.log('  - validateTouchTarget(selector)');
  console.log('  - highlightFailingTouchTargets()');
  console.log('  - clearTouchTargetHighlights()');
})();
