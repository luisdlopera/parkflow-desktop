#!/bin/bash

# Load Test Script using curl with concurrency
# Simulates 100 concurrent entry operations

echo "Starting load test with 100 concurrent entry requests..."

TOKEN=${TOKEN:-"your-jwt-token-here"}
API_URL=${API_URL:-"http://localhost:8080"}

# Function to make a single request
make_request() {
    local i=$1
    curl -s -w "%{http_code}\n" -X POST "$API_URL/api/v1/operations/entries" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{\"plate\":\"LOAD$i\",\"type\":\"CAR\",\"rateId\":\"00000000-0000-0000-0000-000000000001\",\"operatorUserId\":\"00000000-0000-0000-0000-000000000001\"}" \
        -o /dev/null
}

export -f make_request
export TOKEN
export API_URL

# Run 100 requests in parallel
seq 1 100 | xargs -n 1 -P 10 bash -c 'make_request "$@"' _

echo "Load test completed."
echo "Check application logs and metrics for performance analysis."
echo "Expected: All requests should return 200 or 201 status codes."