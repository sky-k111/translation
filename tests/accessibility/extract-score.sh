#!/bin/bash

# Extract Lighthouse Score from HTML Report
# This script parses the latest Lighthouse report and displays the score

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPORTS_DIR="${SCRIPT_DIR}/reports"

# Find the latest report
LATEST_REPORT=$(ls -t "${REPORTS_DIR}"/lighthouse-*.html 2>/dev/null | head -1)

if [ -z "$LATEST_REPORT" ]; then
    echo "❌ No Lighthouse reports found in ${REPORTS_DIR}"
    exit 1
fi

echo "📊 Analyzing latest report:"
echo "   $(basename "$LATEST_REPORT")"
echo ""

# Extract score using grep and sed
# The HTML contains: "score":0.95 (as decimal)
SCORE_DECIMAL=$(grep -o '"accessibility"[^}]*"score":[0-9.]*' "$LATEST_REPORT" | grep -o '[0-9.]*$' | head -1)

if [ -z "$SCORE_DECIMAL" ]; then
    echo "⚠️  Could not extract score from report"
    echo "   Please open the report manually to view results"
    exit 1
fi

# Convert to percentage
SCORE=$(echo "$SCORE_DECIMAL * 100" | bc)

echo "═══════════════════════════════════════════════════════"
echo "           LIGHTHOUSE ACCESSIBILITY SCORE              "
echo "═══════════════════════════════════════════════════════"
echo ""

# Display score with emoji
if (( $(echo "$SCORE >= 90" | bc -l) )); then
    echo "   🟢 ${SCORE}% / 100%"
elif (( $(echo "$SCORE >= 50" | bc -l) )); then
    echo "   🟠 ${SCORE}% / 100%"
else
    echo "   🔴 ${SCORE}% / 100%"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo ""

# Check against target
TARGET=95
if (( $(echo "$SCORE >= $TARGET" | bc -l) )); then
    echo "🎉 SUCCESS! Score meets target of ${TARGET}%"
    echo ""
    echo "✅ Your WordDrawerV2 component has excellent accessibility!"
    echo ""
    echo "Next steps:"
    echo "  • Review the full report for any minor improvements"
    echo "  • Test with real screen readers (NVDA, VoiceOver)"
    echo "  • Document the accessibility features"
    exit 0
else
    DIFF=$(echo "$TARGET - $SCORE" | bc)
    echo "⚠️  Score is ${DIFF}% below target of ${TARGET}%"
    echo ""
    echo "Next steps:"
    echo "  • Open the full report to see failed audits"
    echo "  • Fix the issues identified"
    echo "  • Re-run the audit"
    echo ""
    echo "To view the full report:"
    echo "  open \"$LATEST_REPORT\""
    exit 1
fi
