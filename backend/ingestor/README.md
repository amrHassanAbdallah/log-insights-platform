# Deal Bot Ingestor Service

This service processes log events from SQS messages containing S3 bucket notifications about new log files. The log files are in gzip-compressed JSON format and are persisted to a TimescaleDB database.

## Data Format

The service expects JSON files with the following structure:

```json
[
  {
    "level": 30,
    "time": 1743532441581,
    "timestamp": "2025-04-01T18:34:01.581Z",
    "pid": 46,
    "hostname": "75915b60-c2beffba-b9de-4b",
    "req": {
      "id": 3558,
      "method": "GET",
      "url": "/deals",
      "query": {},
      "headers": {
        "x-forwarded-for": "184.182.215.20",
        "x-forwarded-proto": "https",
        "x-forwarded-port": "443",
        "host": "cur8-api.pub.islamicfinanceguru.dev",
        "x-amzn-trace-id": "Root=1-36ec6b44-66b2bbac-c4fd-41e3b063b5",
        "user-agent": "Cur8Mobile/2.2.9 (iOS 16.4)",
        "cookie": "auth_user_id=1102; access_token=f1406962-e38c-4cbe-a5cf-a5b76707fe4d; refresh_token=7a9be37d-4640-4d4b-bfbb-326eb622afb5"
      },
      "remoteAddress": "::ffff:10.0.236.240",
      "remotePort": 19250
    },
    "context": "ApiController",
    "message": "Processing GET request for /deals",
    "authUserId": 1102
  }
]
```

## Local Development

1. Start the required services:
```bash
docker-compose up -d
```

2. Install dependencies:
```bash
npm install
```

3. Run the service in SQS mode:
```bash
npm run start:dev
```

4. Run the service with a local file:
```bash
npm run start:local
```

## Testing

Run the test suite:
```bash
npm test
```

## Environment Variables

- `AWS_REGION`: AWS region (default: us-east-1)
- `AWS_ENDPOINT`: AWS endpoint (default: http://localhost:4566 for localstack)
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_SQS_QUEUE_URL`: SQS queue URL for receiving S3 notifications
- `LOCAL_FILE_PATH`: Path to a local JSON file for testing (optional)
- `DB_HOST`: Database host (default: localhost)
- `DB_PORT`: Database port (default: 5432)
- `DB_USERNAME`: Database username (default: postgres)
- `DB_PASSWORD`: Database password (default: postgres)
- `DB_DATABASE`: Database name (default: dealbot)

## Local Testing with LocalStack

1. Create a test bucket:
```bash
aws --endpoint-url=http://localhost:4566 s3 mb s3://test-bucket
```

2. Create a test SQS queue:
```bash
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name test-queue
```

3. Configure S3 to send notifications to SQS:
```bash
aws --endpoint-url=http://localhost:4566 s3api put-bucket-notification-configuration \
  --bucket test-bucket \
  --notification-configuration '{
    "QueueConfigurations": [
      {
        "QueueArn": "arn:aws:sqs:us-east-1:000000000000:test-queue",
        "Events": ["s3:ObjectCreated:*"]
      }
    ]
  }'
```

4. Upload a test file:
```bash
aws --endpoint-url=http://localhost:4566 s3 cp test.json.gz s3://test-bucket/
```

## Database Schema

The service uses TimescaleDB with the following schema:

```sql
CREATE TABLE deals (
    id VARCHAR(255) PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    type VARCHAR(255) NOT NULL,
    data JSONB
);
``` 