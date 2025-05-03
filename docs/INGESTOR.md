# Ingestor Service Development Guide

## Overview

The Ingestor Service is responsible for processing log files from S3 buckets, decompressing them, and storing the normalized log data in a TimescaleDB database. It handles both local development and production environments through LocalStack and AWS S3 respectively.

## Architecture

### Components

1. **IngestorService**: Main service that orchestrates the file processing
2. **StorageService**: Handles S3 operations (both AWS and LocalStack)
3. **Log Entity**: Represents the normalized log data structure
4. **ProcessedFile Entity**: Tracks the status of processed files

### File Processing Flow

1. Files are discovered in S3 bucket
2. Each file is queued for processing with a status:
   - `PENDING`: Initial state
   - `PROCESSING`: Currently being processed
   - `COMPLETED`: Successfully processed
   - `FAILED`: Processing failed, can be retried
3. Files are processed in batches for efficiency
4. Each log entry is normalized and stored in the database

## Local Development Setup

### Prerequisites

- Docker and Docker Compose
- AWS CLI configured with credentials
- Node.js and npm

### Environment Setup

1. Start the development environment:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

2. Configure AWS CLI (if not already done):
```bash
aws configure
```

### LocalStack Setup

LocalStack provides a local AWS S3 environment for development. The sync script helps copy files from real S3 to LocalStack.

#### Using the Sync Script

The `sync-to-localstack.sh` script copies files from a real S3 bucket to LocalStack:

```bash
./backend/ingestor/scripts/sync-to-localstack.sh <source-bucket> [prefix]
```

Example:
```bash
./backend/ingestor/scripts/sync-to-localstack.sh dev.deal-bot-logs "2024/04/"
```

The script:
1. Verifies AWS configuration
2. Waits for LocalStack to be ready
3. Creates a test bucket in LocalStack
4. Syncs files from source to LocalStack
5. Verifies the sync by comparing file counts

### Running the Ingestor

1. Build the service:
```bash
cd backend/ingestor
npm install
npm run build
```

2. Start the service:
```bash
npm run start:dev
```

## Development Workflow

### Adding New Features

1. Create a new branch
2. Implement changes
3. Update tests
4. Run tests:
```bash
npm test
```

### Testing

The service includes unit tests and integration tests:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov
```

### Debugging

1. LocalStack logs:
```bash
docker-compose -f docker-compose.dev.yml logs -f localstack
```

2. Ingestor logs:
```bash
docker-compose -f docker-compose.dev.yml logs -f ingestor
```

## File Processing Logic

### Batch Processing

Files are processed in batches of 100 for efficiency:

1. Files are discovered and queued in batches
2. Each batch is processed sequentially
3. Status updates are tracked in the database

### Status Management

Files go through the following status transitions:

1. `PENDING` → `PROCESSING` → `COMPLETED`
   - Normal successful processing flow
2. `PENDING` → `PROCESSING` → `FAILED`
   - Processing failed, can be retried
3. `FAILED` → `PENDING`
   - Retry mechanism for failed files

### Error Handling

- Failed files are logged and marked with `FAILED` status
- Processing continues with the next file
- Failed files can be retried in the next run
- Detailed error information is stored in metadata

## Database Schema

### Log Entity

```typescript
interface Log {
  id: string;
  timestamp: Date;
  level: number;
  method: string;
  url: string;
  query: Record<string, any>;
  headers: Record<string, string>;
  context: string;
  message: string;
  authUserId: number;
  pid: number;
  hostname: string;
  remoteAddress: string;
  remotePort: number;
  processingTimeMs?: number;
  cacheHit?: boolean;
  documentCount?: number;
  lastUpdated?: Date;
  params?: Record<string, any>;
  rawData: any;
}
```

### ProcessedFile Entity

```typescript
interface ProcessedFile {
  s3Key: string;
  bucket: string;
  processedAt: Date;
  status: ProcessedFileStatus;
  metadata: Record<string, any>;
}

enum ProcessedFileStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
```

## Troubleshooting

### Common Issues

1. **LocalStack Connection Issues**
   - Check if LocalStack is running: `docker ps | grep localstack`
   - Verify health: `curl http://localhost:4566/_localstack/health`

2. **AWS Credentials Issues**
   - Run `aws configure` to update credentials
   - Verify configuration: `aws configure list`

3. **Database Connection Issues**
   - Check TimescaleDB logs
   - Verify connection string in environment variables

### Logging

The service uses NestJS's built-in logger. Log levels can be adjusted in the environment:

```bash
export LOG_LEVEL=debug  # Options: error, warn, log, debug, verbose
```

## Deployment

### Production Environment

1. Build the Docker image:
```bash
docker build -t ingestor-service .
```

2. Run with production environment variables:
```bash
docker run -d \
  -e NODE_ENV=production \
  -e DATABASE_URL=... \
  -e AWS_ACCESS_KEY_ID=... \
  -e AWS_SECRET_ACCESS_KEY=... \
  ingestor-service
```

### Environment Variables

Required environment variables:
- `NODE_ENV`: Environment (development/production)
- `DATABASE_URL`: TimescaleDB connection string
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: AWS region
- `AWS_S3_BUCKET`: S3 bucket name
- `AWS_S3_KEY`: S3 key prefix

Optional environment variables:
- `LOG_LEVEL`: Logging level
- `AWS_ENDPOINT`: Custom AWS endpoint (for LocalStack) 