#!/bin/bash

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
while ! curl -s http://localhost:4566/_localstack/health | grep -q '"s3": "running"'; do
  sleep 2
done

# Configure AWS CLI to use LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_ENDPOINT_URL=http://localhost:4566

# Create the bucket
echo "Creating bucket..."
aws --endpoint-url=http://localhost:4566 s3 mb s3://test-bucket

# Create a temporary directory for sample files
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Create some sample log files
for i in {1..5}; do
  cat > "$TEMP_DIR/sample-log-$i.json" << EOF
{
  "level": 1,
  "time": $(date +%s),
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",
  "pid": 1234,
  "hostname": "test-host",
  "req": {
    "id": $i,
    "method": "GET",
    "url": "/test",
    "query": {},
    "headers": {},
    "remoteAddress": "127.0.0.1",
    "remotePort": 12345,
    "params": { "test": "value" }
  },
  "context": "TestContext",
  "message": "test message $i",
  "authUserId": 1,
  "processingTimeMs": 100,
  "cacheHit": true,
  "documentCount": 2,
  "lastUpdated": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"
}
EOF
done

# Compress the files
for file in "$TEMP_DIR"/*.json; do
  gzip -c "$file" > "$file.gz"
done

# Upload the compressed files to S3
echo "Uploading files to S3..."
for file in "$TEMP_DIR"/*.gz; do
  aws --endpoint-url=http://localhost:4566 s3 cp "$file" s3://test-bucket/
done

# List the files in the bucket
echo "Files in bucket:"
aws --endpoint-url=http://localhost:4566 s3 ls s3://test-bucket/

# Clean up
rm -rf "$TEMP_DIR"
echo "Setup complete!" 