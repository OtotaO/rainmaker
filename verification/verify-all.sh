#!/bin/bash

# Rainmaker Dafny Verification Script
# Runs all formal verification proofs to ensure system correctness

echo "🔍 Rainmaker Formal Verification System"
echo "======================================="
echo ""

# Check if Dafny is installed
if ! command -v dafny &> /dev/null; then
    echo "❌ Dafny is not installed!"
    echo ""
    echo "To install Dafny:"
    echo "1. Download from: https://github.com/dafny-lang/dafny/releases"
    echo "2. Add to PATH"
    echo "3. Run this script again"
    exit 1
fi

echo "✅ Dafny found at: $(which dafny)"
echo "Version: $(dafny --version)"
echo ""

# Set verification directory
VERIFY_DIR="$(dirname "$0")"
cd "$VERIFY_DIR"

# Track overall success
ALL_PASSED=true

# Function to verify a Dafny file
verify_file() {
    local file=$1
    local description=$2
    
    echo "🔧 Verifying: $description"
    echo "   File: $file"
    echo -n "   Status: "
    
    if dafny verify "$file" > /tmp/dafny_output.txt 2>&1; then
        echo "✅ PASSED"
        echo ""
    else
        echo "❌ FAILED"
        echo "   Error output:"
        cat /tmp/dafny_output.txt | grep -E "(Error:|error:|Warning:|warning:)" | head -10
        echo ""
        ALL_PASSED=false
    fi
}

# Run all verifications
echo "Starting verification suite..."
echo "=============================="
echo ""

verify_file "component-compatibility.dfy" "Component Compatibility Proofs"
verify_file "schema-consistency.dfy" "Schema Consistency Proofs"
verify_file "build-pipeline-invariants.dfy" "Build Pipeline Invariants"
verify_file "registry-expansion-specs.dfy" "Registry Quality Specifications"

# Summary
echo "=============================="
echo "Verification Summary"
echo "=============================="

if [ "$ALL_PASSED" = true ]; then
    echo "✅ All verifications PASSED!"
    echo ""
    echo "Rainmaker's mathematical guarantees are intact:"
    echo "- Component selections will always be compatible"
    echo "- Type systems will always be consistent"
    echo "- Generated projects will always build"
    echo "- Registry quality is mathematically assured"
    echo ""
    echo "🚀 Ready to generate production-quality code!"
    exit 0
else
    echo "❌ Some verifications FAILED!"
    echo ""
    echo "⚠️  WARNING: Do not use Rainmaker until all proofs pass!"
    echo "Fix the failing proofs before generating any code."
    exit 1
fi
