#!/bin/bash

# test-localstack.sh
# Usage: ./test-localstack.sh <API_URL>

API_URL=$1

if [ -z "$API_URL" ]; then
    echo "Usage: ./test-localstack.sh <API_URL>"
    exit 1
fi

echo "--- Testing LocalStack API: $API_URL ---"

# 1. Upload
echo "Testing Upload..."
UPLOAD_RES=$(curl -s -X POST "${API_URL}upload" \
  -H "Content-Type: application/json" \
  -d '{"key": "testfile.txt", "content": "Hello from LocalStack!"}')

echo "Upload Response: $UPLOAD_RES"

# 2. Download
echo "Testing Download..."
DOWNLOAD_RES=$(curl -s -X GET "${API_URL}download?key=testfile.txt")

echo "Download Response: $DOWNLOAD_RES"

CONTENT=$(echo $DOWNLOAD_RES | grep -o '"content":"[^"]*"' | cut -d'"' -f4)

if [ "$CONTENT" == "Hello from LocalStack!" ]; then
    echo "SUCCESS: Content matches!"
else
    echo "FAILURE: Content mismatch! Got: $CONTENT"
    exit 1
fi
