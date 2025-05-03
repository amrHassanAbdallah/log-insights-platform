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