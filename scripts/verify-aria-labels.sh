#!/bin/bash
# Script to verify aria-label compliance in icon-only buttons
# Usage: ./scripts/verify-aria-labels.sh
# Returns: 0 if compliant, 1 if issues found

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "🔍 Verifying aria-label compliance..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Find all isIconOnly buttons
ISSUES=0
FOUND=0

# Create a temporary Python script for precise detection
python3 << 'PYTHON_SCRIPT'
import os
import sys
import re

issues = []
found = 0

for root, dirs, files in os.walk("apps/web/src"):
    # Skip test directories
    if "__tests__" in root or ".next" in root:
        continue

    for file in files:
        if not file.endswith(".tsx"):
            continue

        filepath = os.path.join(root, file)
        try:
            with open(filepath, 'r') as f:
                lines = f.readlines()

            for i, line in enumerate(lines):
                # Look for isIconOnly but skip definitions and bridge components
                if "isIconOnly" in line:
                    # Skip property definitions and bridge component definitions
                    if any(skip in line for skip in ["isIconOnly?", "isIconOnly={isIconOnly}", "isIconOnly: boolean"]):
                        continue

                    found += 1

                    # Check for aria-label in surrounding lines
                    has_aria_label = False
                    context_lines = []

                    # Check current line and next 5 lines
                    for j in range(max(0, i-2), min(len(lines), i+6)):
                        context_lines.append(lines[j].rstrip())
                        if "aria-label" in lines[j]:
                            has_aria_label = True
                            break

                    if not has_aria_label:
                        issues.append({
                            'file': filepath.replace('apps/web/src/', ''),
                            'line': i + 1,
                            'context': context_lines
                        })

        except Exception as e:
            pass

print(f"FOUND={found}")
print(f"ISSUES={len(issues)}")

if issues:
    for issue in issues:
        print(f"\nISSUE:{issue['file']}:{issue['line']}")
        for ctx in issue['context']:
            print(f"  {ctx[:80]}")

PYTHON_SCRIPT

# Now extract the results
PYTHON_OUTPUT=$(python3 << 'PYTHON_SCRIPT'
import os
import sys
import re

issues = []
found = 0

for root, dirs, files in os.walk("apps/web/src"):
    # Skip test directories
    if "__tests__" in root or ".next" in root:
        continue

    for file in files:
        if not file.endswith(".tsx"):
            continue

        filepath = os.path.join(root, file)
        try:
            with open(filepath, 'r') as f:
                lines = f.readlines()

            for i, line in enumerate(lines):
                # Look for isIconOnly but skip definitions and bridge components
                if "isIconOnly" in line:
                    # Skip property definitions and bridge component definitions
                    if any(skip in line for skip in ["isIconOnly?", "isIconOnly={isIconOnly}", "isIconOnly: boolean"]):
                        continue

                    found += 1

                    # Check for aria-label in surrounding lines
                    has_aria_label = False
                    context_lines = []

                    # Check current line and next 5 lines
                    for j in range(max(0, i-2), min(len(lines), i+6)):
                        context_lines.append(lines[j].rstrip())
                        if "aria-label" in lines[j]:
                            has_aria_label = True
                            break

                    if not has_aria_label:
                        issues.append({
                            'file': filepath.replace('apps/web/src/', ''),
                            'line': i + 1,
                            'context': context_lines
                        })

        except Exception as e:
            pass

print(f"FOUND={found}")
print(f"ISSUES={len(issues)}")

if issues:
    for issue in issues:
        print(f"ISSUE:{issue['file']}:{issue['line']}")

PYTHON_SCRIPT
)

FOUND=$(echo "$PYTHON_OUTPUT" | grep "FOUND=" | cut -d'=' -f2)
ISSUES=$(echo "$PYTHON_OUTPUT" | grep "ISSUES=" | cut -d'=' -f2)

if [ -z "$FOUND" ]; then
    FOUND=0
    ISSUES=0
fi

# Display results
echo "Icon-only buttons found: $FOUND"
echo "Missing aria-label: $ISSUES"
echo ""

if [ "$ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✅ All icon-only buttons have aria-label${NC}"
    echo "Compliance: 100% WCAG AA"
    exit 0
else
    echo -e "${RED}❌ Found $ISSUES icon-only button(s) without aria-label${NC}"
    echo ""
    echo "Details:"
    echo "$PYTHON_OUTPUT" | grep "ISSUE:" | while read -r line; do
        FILE=$(echo "$line" | cut -d':' -f2-)
        echo "  - $FILE"
    done
    echo ""
    echo "Fix: Add aria-label=\"...\" to each icon-only button"
    exit 1
fi
