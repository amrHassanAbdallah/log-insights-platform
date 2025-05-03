#!/bin/bash

# Exit on error
set -e

# Configuration
LOCAL_DATA_DIR="./s3_data"
LOCALSTACK_ENDPOINT="http://localhost:4566"
LOCALSTACK_BUCKET="test-bucket"

# Function to verify AWS credentials
verify_aws_credentials() {
   echo "Verifying AWS configuration..."
    if ! aws configure list | grep -q "access_key"; then
        echo "Error: AWS CLI is not configured"
        echo "Please run 'aws configure' to set up your credentials"
        exit 1
    fi
    echo "AWS configuration verified, proceeding with sync..."
}

# Function to wait for LocalStack to be ready
wait_for_localstack() {
  echo "Waiting for LocalStack to be ready..."
  while ! curl -s "$LOCALSTACK_ENDPOINT/_localstack/health" | grep -q '"s3": "running"'; do
    sleep 2
  done
  echo "LocalStack is ready!"
}

# Function to create bucket in LocalStack
create_localstack_bucket() {
  echo "Creating bucket $LOCALSTACK_BUCKET in LocalStack..."
  aws --endpoint-url="$LOCALSTACK_ENDPOINT" s3 mb "s3://$LOCALSTACK_BUCKET"
}

# Function to check if local files exist
check_local_files() {
  local source_bucket="$1"
  local prefix="$2"
  local local_dir="$LOCAL_DATA_DIR/$source_bucket/$prefix"
  
  if [ -d "$local_dir" ] && [ "$(ls -A "$local_dir" 2>/dev/null)" ]; then
    echo "Found existing local files in $local_dir"
    return 0
  else
    echo "No existing local files found in $local_dir"
    return 1
  fi
}

# Function to sync files from S3 to local directory
sync_to_local() {
  local source_bucket="$1"
  local prefix="$2"
  local dry_run="$3"
  
  echo "Syncing files from s3://$source_bucket/$prefix to $LOCAL_DATA_DIR..."
  
  # Create local directory if it doesn't exist
  mkdir -p "$LOCAL_DATA_DIR/$source_bucket/$prefix"
  
  # Check if we have existing files
  if check_local_files "$source_bucket" "$prefix"; then
    echo "Using existing local files. Only downloading new or modified files..."
    aws s3 sync "s3://$source_bucket/$prefix" "$LOCAL_DATA_DIR/$source_bucket/$prefix" \
      --exclude "*" \
      --include "*.json.gz" \
      ${dry_run:+--dryrun}
  else
    echo "No existing files found. Downloading all files..."
    aws s3 sync "s3://$source_bucket/$prefix" "$LOCAL_DATA_DIR/$source_bucket/$prefix" \
      --exclude "*" \
      --include "*.json.gz" \
      ${dry_run:+--dryrun}
  fi
  
  echo "Files downloaded to $LOCAL_DATA_DIR/$source_bucket/$prefix"
}

# Function to sync files from local directory to LocalStack
sync_to_localstack() {
  local source_bucket="$1"
  local prefix="$2"
  local dry_run="$3"
  
  echo "Syncing files from $LOCAL_DATA_DIR to LocalStack..."
  
  # Upload files to LocalStack
  aws --endpoint-url="$LOCALSTACK_ENDPOINT" s3 sync "$LOCAL_DATA_DIR/$source_bucket/$prefix" "s3://$LOCALSTACK_BUCKET/$prefix" \
    --exclude "*" \
    --include "*.json.gz" \
    ${dry_run:+--dryrun}
  
  echo "Files uploaded to LocalStack"
}

# Main execution
if [ $# -lt 1 ]; then
  echo "Usage: $0 <source-bucket> [prefix] [--dry-run]"
  echo "  <source-bucket>: The S3 bucket to sync from"
  echo "  [prefix]: Optional prefix to filter files"
  echo "  [--dry-run]: Show what would be downloaded/uploaded without making changes"
  exit 1
fi

source_bucket="$1"
prefix="${2:-}"
dry_run=""
if [ "$3" = "--dry-run" ]; then
  dry_run="--dry-run"
  echo "Running in dry-run mode - no files will be downloaded or uploaded"
fi

# Verify AWS credentials
verify_aws_credentials

# Wait for LocalStack
wait_for_localstack

# Create bucket in LocalStack
create_localstack_bucket

# Sync files from S3 to local directory
sync_to_local "$source_bucket" "$prefix" "$dry_run"

# Sync files from local directory to LocalStack
sync_to_localstack "$source_bucket" "$prefix" "$dry_run"

echo "Sync completed successfully!"
echo "Local files are stored in: $LOCAL_DATA_DIR" 