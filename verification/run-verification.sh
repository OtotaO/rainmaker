#!/bin/bash
# This script runs formal verification on the ConfigSetting model
# Requires Dafny to be installed: https://github.com/dafny-lang/dafny

echo "Running Dafny verification on ConfigSetting model..."
dafny verify configSetting.dfy

if [ $? -eq 0 ]; then
  echo "✅ Verification successful! The formal model is correct."
else
  echo "❌ Verification failed. Please check the errors above."
  exit 1
fi

echo "The verification confirms that the ConfigSetting implementation's key properties hold:"
echo "1. The uniqueness constraint on the 'key' field is correctly enforced"
echo "2. Validation rules (e.g., non-empty key) are properly applied"
echo "3. The repository state remains consistent after operations"
