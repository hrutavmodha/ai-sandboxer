#!/bin/bash
# Task 1: Project Setup & Dev Environment Verification

echo "Verifying Task 1..."

# 1. Verify index.html exists
if [ -f "index.html" ]; then
  echo "✅ index.html exists"
else
  echo "❌ index.html is missing"
  exit 1
fi

# 2. Verify src/main.ts exists
if [ -f "src/main.ts" ]; then
  echo "✅ src/main.ts exists"
else
  echo "❌ src/main.ts is missing"
  exit 1
fi

# 3. Verify TypeScript compilation
echo "Running tsc --noEmit..."
npm exec tsc --noEmit
if [ $? -eq 0 ]; then
  echo "✅ TypeScript compilation passed"
else
  echo "❌ TypeScript compilation failed"
  exit 1
fi

echo "Task 1 verification complete."
