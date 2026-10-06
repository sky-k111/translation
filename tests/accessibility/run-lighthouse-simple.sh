#!/bin/bash

# Simple Lighthouse Accessibility Test Script
# This script runs a Lighthouse accessibility audit on the test page

echo "🚀 Starting Lighthouse Accessibility Audit..."
echo ""

# Get the absolute path to the test HTML file
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TEST_FILE="file://${SCRIPT_DIR}/lighthouse-test.html"

echo "📄 Test page: ${TEST_FILE}"
echo ""

# Create reports directory if it doesn't exist
mkdir -p "${SCRIPT_DIR}/reports"

# Generate timestamp for report filename
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_FILE="${SCRIPT_DIR}/reports/lighthouse-${TIMESTAMP}.html"

echo "🔍 Running Lighthouse audit..."
echo ""

# Run Lighthouse with accessibility category only
lighthouse "${TEST_FILE}" \
  --only-categories=accessibility \
  --output=html \
  --output-path="${REPORT_FILE}" \
  --chrome-flags="--headless" \
  --quiet

# Check if lighthouse command succeeded
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Audit complete!"
    echo ""
    echo "📊 Report saved to:"
    echo "   ${REPORT_FILE}"
    echo ""
    echo "🌐 Opening report in browser..."
    
    # Open the report in default browser (macOS)
    open "${REPORT_FILE}"
    
    echo ""
    echo "✨ Done! Check the browser for detailed results."
else
    echo ""
    echo "❌ Lighthouse audit failed. Please check the error messages above."
    exit 1
fi
