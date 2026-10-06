#!/bin/bash

# Lighthouse Test with Local Server
# This script starts a local server and runs Lighthouse

echo "🚀 Starting Lighthouse Accessibility Audit with Local Server..."
echo ""

# Get the project root directory (2 levels up from this script)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "${SCRIPT_DIR}/../.." && pwd )"

# Create reports directory
mkdir -p "${SCRIPT_DIR}/reports"

# Check if http-server is installed
if ! command -v http-server &> /dev/null; then
    echo "📦 Installing http-server..."
    npm install -g http-server
fi

# Start http-server in background
echo "🌐 Starting local server on port 8080..."
http-server "${PROJECT_ROOT}" -p 8080 -c-1 --silent &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Test URL
TEST_URL="http://localhost:8080/tests/accessibility/lighthouse-test.html"

echo "📄 Test URL: ${TEST_URL}"
echo ""

# Generate timestamp for report
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_FILE="${SCRIPT_DIR}/reports/lighthouse-${TIMESTAMP}.html"

echo "🔍 Running Lighthouse audit..."
echo ""

# Run Lighthouse
lighthouse "${TEST_URL}" \
  --only-categories=accessibility \
  --output=html \
  --output-path="${REPORT_FILE}" \
  --chrome-flags="--headless --no-sandbox --disable-gpu" \
  --quiet

LIGHTHOUSE_EXIT_CODE=$?

# Kill the server
echo ""
echo "🛑 Stopping local server..."
kill $SERVER_PID 2>/dev/null

# Check results
if [ $LIGHTHOUSE_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Audit complete!"
    echo ""
    echo "📊 Report saved to:"
    echo "   ${REPORT_FILE}"
    echo ""
    
    # Extract score from report (simple grep)
    if command -v grep &> /dev/null; then
        SCORE=$(grep -o '"accessibility":[^}]*"score":[0-9.]*' "${REPORT_FILE}" | grep -o '[0-9.]*$' | head -1)
        if [ ! -z "$SCORE" ]; then
            SCORE_PERCENT=$(echo "$SCORE * 100" | bc)
            echo "🎯 Accessibility Score: ${SCORE_PERCENT}%"
            echo ""
            
            # Check if meets target
            if (( $(echo "$SCORE_PERCENT >= 95" | bc -l) )); then
                echo "🎉 SUCCESS! Score meets target of 95%"
            else
                echo "⚠️  Score is below target of 95%"
            fi
            echo ""
        fi
    fi
    
    echo "🌐 Opening report in browser..."
    open "${REPORT_FILE}"
    
    echo ""
    echo "✨ Done!"
    exit 0
else
    echo ""
    echo "❌ Lighthouse audit failed."
    exit 1
fi
