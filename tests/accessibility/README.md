# Lighthouse Accessibility Testing Guide

## 📋 Overview

This directory contains tools for running Lighthouse accessibility audits on the WordDrawerV2 component.

**Target Score**: ≥ 95 / 100

## 🚀 Quick Start

### Method 1: Simple Shell Script (Recommended)

```bash
# Navigate to this directory
cd tests/accessibility

# Run the audit
./run-lighthouse-simple.sh
```

This will:
1. Run Lighthouse on the test page
2. Generate an HTML report
3. Automatically open the report in your browser

### Method 2: Direct Lighthouse Command

```bash
# From project root
lighthouse "file://$(pwd)/tests/accessibility/lighthouse-test.html" \
  --only-categories=accessibility \
  --output=html \
  --output-path=tests/accessibility/reports/lighthouse-report.html \
  --view
```

### Method 3: Using Chrome DevTools (Manual)

1. Open Chrome browser
2. Navigate to: `file:///path/to/your/project/tests/accessibility/lighthouse-test.html`
3. Press `F12` to open DevTools
4. Click the **Lighthouse** tab
5. Select **Accessibility** category only
6. Click **Analyze page load**
7. Review the results

## 📁 Files

- **lighthouse-test.html** - Test page with WordDrawerV2 component
- **run-lighthouse-simple.sh** - Simple shell script to run audit
- **run-lighthouse.js** - Advanced Node.js script (requires npm install)
- **package.json** - Dependencies for advanced script
- **reports/** - Generated audit reports (auto-created)

## 🧪 Test Page Features

The test page (`lighthouse-test.html`) includes:

- ✅ WordDrawerV2 component with all accessibility features
- ✅ Sample data for testing
- ✅ Theme toggle (light/dark)
- ✅ Keyboard shortcuts documentation
- ✅ Testing instructions

### Interactive Testing

1. **Open the drawer**: Click "Open with Sample Data" button
2. **Test keyboard navigation**:
   - `Escape` - Close drawer
   - `←` / `→` - Navigate between words
   - `Tab` - Move focus between elements
   - `Space` / `Enter` - Activate buttons
3. **Test screen reader**: Use NVDA (Windows) or VoiceOver (Mac)
4. **Test focus indicators**: Navigate with keyboard and verify visible focus

## 📊 Understanding Results

### Score Ranges

| Score | Status | Action |
|-------|--------|--------|
| 90-100 | 🟢 Excellent | Maintain standards |
| 50-89 | 🟠 Needs Work | Review failed audits |
| 0-49 | 🔴 Poor | Immediate fixes needed |

### Common Issues

**Color Contrast**
- Text must have 4.5:1 contrast ratio (normal text)
- Large text must have 3:1 contrast ratio
- Fix: Update CSS color variables

**Missing ARIA Attributes**
- All interactive elements need accessible names
- Dialogs need proper roles
- Fix: Add aria-label, aria-labelledby

**Keyboard Navigation**
- All functionality must work with keyboard only
- Focus must be visible
- Fix: Add keyboard event handlers, focus styles

**Touch Targets**
- Interactive elements must be ≥ 44x44px
- Fix: Update button sizes in CSS

## 🔧 Troubleshooting

### "lighthouse: command not found"

Install Lighthouse globally:
```bash
npm install -g lighthouse
```

### "Cannot access file://"

Make sure you're using the absolute path:
```bash
lighthouse "file://$(pwd)/tests/accessibility/lighthouse-test.html"
```

### Test page doesn't load properly

Check that all dependencies are in place:
```bash
# From project root
ls extension/components/complex/word-drawer-v2.js
ls extension/utils/accessibility/FocusManager.js
ls extension/utils/accessibility/ARIAManager.js
ls extension/utils/accessibility/KeyboardManager.js
```

### Chrome crashes or hangs

Try without headless mode:
```bash
lighthouse "file://$(pwd)/tests/accessibility/lighthouse-test.html" \
  --only-categories=accessibility \
  --chrome-flags="--no-sandbox"
```

## 📈 Continuous Testing

### Add to CI/CD

```yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests

on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install Lighthouse
        run: npm install -g lighthouse
      - name: Run Lighthouse
        run: |
          cd tests/accessibility
          ./run-lighthouse-simple.sh
      - name: Upload Report
        uses: actions/upload-artifact@v2
        with:
          name: lighthouse-report
          path: tests/accessibility/reports/
```

### Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash
cd tests/accessibility
./run-lighthouse-simple.sh
if [ $? -ne 0 ]; then
    echo "❌ Accessibility audit failed. Commit aborted."
    exit 1
fi
```

## 🎯 Next Steps

After running the audit:

1. **Review the report** - Check which audits passed/failed
2. **Fix issues** - Address any failed audits
3. **Re-run audit** - Verify fixes improved the score
4. **Document changes** - Update test-results.md
5. **Commit** - Save your improvements

## 📚 Resources

- [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Chrome DevTools Accessibility](https://developer.chrome.com/docs/devtools/accessibility/)
- [axe DevTools Extension](https://www.deque.com/axe/devtools/)

## 🆘 Need Help?

If you encounter issues:

1. Check the troubleshooting section above
2. Review the Lighthouse documentation
3. Check browser console for errors
4. Verify all files are in correct locations

---

**Last Updated**: 2024
**Target Score**: ≥ 95 / 100
**Status**: Ready for testing
