# Ingestor Service

A service for ingesting and processing log files from S3 into a database.

## Features

- Process log files from S3 buckets
- Support for gzipped JSON log files
- Automatic retry for failed files
- Stuck job detection and recovery
- Paginated job processing
- Efficient file filtering based on log timestamps
- Local file processing support
- Safe concurrent processing with database-level locking

## Deployment

The service is designed to run periodically to process new log files. There are two recommended deployment approaches:

### Kubernetes CronJob (Recommended) 🚀

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: log-ingestor
spec:
  schedule: "*/5 * * * *"  # Run every 5 minutes
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: ingestor
            image: your-registry/ingestor:latest
            env:
            - name: AWS_REGION
              value: us-east-1
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: secret-access-key
            - name: DB_HOST
              value: postgres
            - name: DB_PORT
              value: "5432"
            - name: DB_USERNAME
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: username
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
          restartPolicy: OnFailure
```

Benefits of using Kubernetes CronJob:
- Built-in scheduling and retry mechanisms
- Automatic scaling and resource management
- Easy monitoring and logging
- Seamless integration with other Kubernetes services
- Better resource utilization (pods are only active during processing)

### Alternative: Continuous Running Service ⏰

If you prefer to run the service continuously, you can use a sleep loop:

```typescript
// In your main.ts or similar
async function runIngestor() {
  while (true) {
    try {
      await ingestorService.processFiles('your-bucket');
    } catch (error) {
      logger.error('Error processing files:', error);
    }
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // Sleep for 5 minutes
  }
}
```

However, this approach is not recommended because:
- Wastes resources when idle
- More complex error handling
- Harder to monitor and scale
- Less reliable than Kubernetes CronJob

## Concurrent Processing

The service is designed to run safely with multiple instances. It uses several mechanisms to prevent conflicts:

1. **Pessimistic Locking** 🔒
   - When an instance processes a job, it acquires a database lock
   - Other instances must wait for the lock to be released
   - Ensures only one instance processes a job at a time

2. **Unique Constraints** 🎯
   - Each file (identified by S3 key and bucket) can only be processed once
   - Prevents duplicate processing of the same file
   - Ensures data consistency across instances

3. **Transactions** 🔄
   - Critical operations are wrapped in database transactions
   - If any part of the operation fails, all changes are rolled back
   - Ensures atomic operations (all-or-nothing)

4. **Version Control** 📝
   - Each record has a version number
   - Prevents concurrent updates to the same record
   - Ensures data integrity during updates

This means you can safely run multiple instances of the service to:
- Increase processing throughput
- Provide high availability
- Handle increased load

## Log Format

The service expects JSON files with the following structure:

```json
[
  {
    "level": 30,
    "time": 1743532441581,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "pid": 46,
    "hostname": "server-1",
    "req": {
      "id": 3558,
      "method": "GET",
      "url": "/api/endpoint",
      "query": {},
      "headers": {
        "x-forwarded-for": "184.182.215.20",
        "x-forwarded-proto": "https",
        "x-forwarded-port": "443",
        "host": "api.example.com",
        "user-agent": "Mozilla/5.0"
      },
      "remoteAddress": "::ffff:10.0.236.240",
      "remotePort": 19250
    },
    "context": "ApiController",
    "message": "Processing GET request",
    "authUserId": 1102,
    "processingTimeMs": 100,
    "cacheHit": true,
    "documentCount": 2,
    "lastUpdated": "2024-01-01T00:00:00.000Z"
  }
]
```

## Persistence

Logs are persisted to the database with the following schema:

```typescript
interface Log {
  id: string;                    // Generated from req.id or random
  timestamp: Date;               // From log.timestamp
  level: string;                 // From log.level
  method: string;                // From log.req.method
  url: string;                   // From log.req.url
  query: Record<string, any>;    // From log.req.query
  headers: Record<string, string>; // From log.req.headers
  context: string;               // From log.context
  message: string;               // From log.message
  authUserId: number;            // From log.authUserId
  pid: number;                   // From log.pid
  hostname: string;              // From log.hostname
  remoteAddress: string;         // From log.req.remoteAddress
  remotePort: number;            // From log.req.remotePort
  processingTimeMs: number;      // From log.processingTimeMs
  cacheHit: boolean;             // From log.cacheHit
  documentCount: number;         // From log.documentCount
  lastUpdated: Date;             // From log.lastUpdated
  params: Record<string, any>;   // From log.req.params
  rawData: any;                  // Complete original log entry
  createdAt: Date;               // When the record was created
  updatedAt: Date;               // When the record was last updated
}
```

Processed files are tracked with:

```typescript
interface ProcessedFile {
  s3Key: string;                // S3 object key
  bucket: string;               // S3 bucket name
  status: ProcessedFileStatus;  // PENDING, PROCESSING, COMPLETED, FAILED
  processedAt: Date;            // When the file was processed
  createdAt: Date;              // When the record was created
  updatedAt: Date;              // When the record was last updated
  metadata: {
    size?: number;              // File size in bytes
    error?: string;             // Error message if failed
    lastAttempt?: Date;         // Last processing attempt
  };
}
```

## Processing Flow

1. First checks for and processes any pending jobs
2. If no pending jobs, checks S3 for new files
3. Filters files based on the most recent log timestamp
4. Processes files in chronological order
5. Updates job status and metadata throughout processing

## Configuration

```typescript
// Environment Variables
AWS_REGION=us-east-1
AWS_ENDPOINT=http://localhost:4566  // For local development
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

## Usage

```typescript
// Process files from S3
await ingestorService.processFiles('my-bucket', 'my-prefix');

// Process local file
await ingestorService.processLocalFile('path/to/file.json');
```

## Future Work

### High Priority
- [ ] Implement chunked file processing for large files
- [ ] Add streaming support for memory-efficient processing
- [ ] Replace database with message queue for better scalability
- [ ] Add environment-specific commands and configurations
- [ ] revist the concurrency and locking over read
- [ ] TODO# gave it another testing with empty state
- [ ] TODO# gave it another testing with new records


### Medium Priority
- [ ] Add metrics and monitoring
- [ ] Implement rate limiting
- [ ] Add support for different log formats
- [ ] Add support for custom log processors

### Low Priority
- [ ] Add support for different storage backends
- [ ] Add support for different database backends
- [ ] Add support for different queue backends
- [ ] Add support for different log formats

## Development

### Setup
1. Install dependencies: `npm install`
2. Start local services: `docker-compose -f docker-compose.dev.yml up -d`
3. Run tests: `npm test`

### Testing
- Unit tests: `npm test`
- Integration tests: `npm run test:integration`
- E2E tests: `npm run test:e2e`

## Architecture

### Components
- `IngestorService`: Main service for processing files
- `StorageService`: Handles S3 operations
- `Log`: Entity for storing log entries
- `ProcessedFile`: Entity for tracking processed files

### Data Flow
1. Files are listed from S3
2. Files are filtered based on last processed log timestamp
3. Files are processed in chronological order
4. Logs are saved to database
5. File status is updated

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 