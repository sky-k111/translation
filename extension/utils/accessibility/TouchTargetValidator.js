/**
 * TouchTargetValidator
 * 
 * Validates touch target sizes and spacing for WCAG 2.1 AA compliance.
 * Ensures all interactive elements meet minimum 44x44px requirements
 * and have adequate spacing between adjacent targets.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

class TouchTargetValidator {
  /**
   * Minimum touch target dimensions (WCAG 2.1 AA)
   */
  static MINIMUM_SIZE = 44; // pixels
  
  /**
   * Minimum spacing between adjacent touch targets
   */
  static MINIMUM_SPACING = 8; // pixels

  /**
   * Validates if an element meets minimum touch target size requirements
   * @param {HTMLElement} element - Element to validate
   * @returns {Object} Validation result with dimensions and pass/fail status
   */
  static validateTouchTarget(element) {
    if (!element || !(element instanceof HTMLElement)) {
      return {
        valid: false,
        error: 'Invalid element provided'
      };
    }

    const rect = element.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const meetsWidth = width >= this.MINIMUM_SIZE;
    const meetsHeight = height >= this.MINIMUM_SIZE;
    const valid = meetsWidth && meetsHeight;

    return {
      valid,
      width,
      height,
      requiredWidth: this.MINIMUM_SIZE,
      requiredHeight: this.MINIMUM_SIZE,
      meetsWidth,
      meetsHeight,
      element,
      selector: this._getElementSelector(element)
    };
  }

  /**
   * Checks if dimensions meet minimum size requirements
   * @param {number} width - Width in pixels
   * @param {number} height - Height in pixels
   * @returns {boolean} True if both dimensions meet minimum
   */
  static meetsMinimumSize(width, height) {
    return width >= this.MINIMUM_SIZE && height >= this.MINIMUM_SIZE;
  }

  /**
   * Validates spacing between two adjacent elements
   * @param {HTMLElement} element1 - First element
   * @param {HTMLElement} element2 - Second element
   * @returns {Object} Spacing validation result
   */
  static validateSpacing(element1, element2) {
    if (!element1 || !element2) {
      return {
        valid: false,
        error: 'Invalid elements provided'
      };
    }

    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();

    // Calculate spacing between elements
    // Check if elements overlap or are adjacent
    let spacing = 0;
    
    // Check horizontal spacing
    if (rect1.right <= rect2.left) {
      // element1 is to the left of element2
      spacing = rect2.left - rect1.right;
    } else if (rect2.right <= rect1.left) {
      // element2 is to the left of element1
      spacing = rect1.left - rect2.right;
    }
    
    // Check vertical spacing if no horizontal spacing
    if (spacing === 0) {
      if (rect1.bottom <= rect2.top) {
        // element1 is above element2
        spacing = rect2.top - rect1.bottom;
      } else if (rect2.bottom <= rect1.top) {
        // element2 is above element1
        spacing = rect1.top - rect2.bottom;
      }
    }

    const valid = spacing >= this.MINIMUM_SPACING;

    return {
      valid,
      spacing,
      requiredSpacing: this.MINIMUM_SPACING,
      element1: this._getElementSelector(element1),
      element2: this._getElementSelector(element2)
    };
  }

  /**
   * Validates all interactive elements in a container
   * @param {HTMLElement} container - Container element to scan
   * @returns {Object} Batch validation results
   */
  static validateAllInteractiveElements(container) {
    if (!container) {
      return {
        valid: false,
        error: 'No container provided'
      };
    }

    // Query all interactive elements
    const interactiveSelectors = [
      'button',
      'a[href]',
      'input:not([type="hidden"])',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[tabindex]:not([tabindex="-1"])'
    ];

    const elements = container.querySelectorAll(interactiveSelectors.join(', '));
    const results = [];
    const failures = [];

    elements.forEach(element => {
      // Skip hidden elements
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return;
      }

      const validation = this.validateTouchTarget(element);
      results.push(validation);

      if (!validation.valid) {
        failures.push(validation);
      }
    });

    return {
      valid: failures.length === 0,
      totalElements: results.length,
      passedElements: results.length - failures.length,
      failedElements: failures.length,
      results,
      failures
    };
  }

  /**
   * Generates a comprehensive validation report
   * @param {HTMLElement} container - Container to validate
   * @returns {Object} Detailed validation report
   */
  static generateTouchTargetReport(container) {
    const validation = this.validateAllInteractiveElements(container);
    
    if (!validation.valid) {
      const report = {
        summary: {
          passed: validation.valid,
          totalElements: validation.totalElements,
          passedElements: validation.passedElements,
          failedElements: validation.failedElements,
          complianceRate: validation.totalElements > 0 
            ? ((validation.passedElements / validation.totalElements) * 100).toFixed(1) + '%'
            : 'N/A'
        },
        failures: validation.failures.map(failure => ({
          selector: failure.selector,
          dimensions: `${failure.width.toFixed(1)}x${failure.height.toFixed(1)}px`,
          required: `${failure.requiredWidth}x${failure.requiredHeight}px`,
          widthDeficit: failure.meetsWidth ? 0 : (failure.requiredWidth - failure.width).toFixed(1),
          heightDeficit: failure.meetsHeight ? 0 : (failure.requiredHeight - failure.height).toFixed(1)
        })),
        recommendations: this._generateRecommendations(validation.failures)
      };

      return report;
    }

    return {
      summary: {
        passed: true,
        totalElements: validation.totalElements,
        passedElements: validation.passedElements,
        failedElements: 0,
        complianceRate: '100%'
      },
      message: 'All interactive elements meet touch target requirements'
    };
  }

  /**
   * Generates recommendations for fixing touch target issues
   * @param {Array} failures - Array of failed validations
   * @returns {Array} Array of recommendation strings
   * @private
   */
  static _generateRecommendations(failures) {
    const recommendations = [];
    const uniqueIssues = new Set();

    failures.forEach(failure => {
      if (!failure.meetsWidth && !failure.meetsHeight) {
        uniqueIssues.add('both');
      } else if (!failure.meetsWidth) {
        uniqueIssues.add('width');
      } else if (!failure.meetsHeight) {
        uniqueIssues.add('height');
      }
    });

    if (uniqueIssues.has('both')) {
      recommendations.push(
        `Increase both width and height to minimum ${this.MINIMUM_SIZE}px using CSS min-width and min-height properties`
      );
    } else {
      if (uniqueIssues.has('width')) {
        recommendations.push(
          `Increase width to minimum ${this.MINIMUM_SIZE}px using CSS min-width property`
        );
      }
      if (uniqueIssues.has('height')) {
        recommendations.push(
          `Increase height to minimum ${this.MINIMUM_SIZE}px using CSS min-height property`
        );
      }
    }

    recommendations.push(
      `Add padding to increase touch target size without changing visual appearance`,
      `Ensure ${this.MINIMUM_SPACING}px spacing between adjacent interactive elements`,
      `Use CSS classes like .touch-target-min to enforce consistent sizing`
    );

    return recommendations;
  }

  /**
   * Gets a CSS selector string for an element
   * @param {HTMLElement} element - Element to get selector for
   * @returns {string} CSS selector string
   * @private
   */
  static _getElementSelector(element) {
    if (!element) return 'unknown';
    
    // Try ID first
    if (element.id) {
      return `#${element.id}`;
    }

    // Try class names
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/).slice(0, 2);
      if (classes.length > 0 && classes[0]) {
        return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
      }
    }

    // Try role
    const role = element.getAttribute('role');
    if (role) {
      return `${element.tagName.toLowerCase()}[role="${role}"]`;
    }

    // Fallback to tag name
    return element.tagName.toLowerCase();
  }

  /**
   * Validates touch targets and logs results to console (development mode)
   * @param {HTMLElement} container - Container to validate
   */
  static validateAndLog(container) {
    const report = this.generateTouchTargetReport(container);
    
    console.group('Touch Target Validation Report');
    console.log('Summary:', report.summary);
    
    if (!report.summary.passed) {
      console.warn(`${report.summary.failedElements} elements failed validation`);
      console.table(report.failures);
      console.log('Recommendations:');
      report.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    } else {
      console.log('✓ All touch targets meet requirements');
    }
    
    console.groupEnd();
    
    return report;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TouchTargetValidator;
}
