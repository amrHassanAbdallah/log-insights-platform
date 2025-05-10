

2
# Functional Requirements Analysis
## Background
Log sample
```
{
    "level": 30,
    "time": 1743611989520,
    "timestamp": "2025-04-02T16:39:49.520Z",
    "pid": 27,
    "hostname": "ad9b37fc-25a46f0c-e3aa-46",
    "req": {
      "id": 2629,
      "method": "POST",
      "url": "/deals/342/bot/query",
      "query": {},
      "params": { "0": "deals/342/bot/query" },
      "headers": {
        "x-forwarded-for": "218.77.74.53",
        "x-forwarded-proto": "https",
        "x-forwarded-port": "443",
        "host": "cur8-api.pub.islamicfinanceguru.dev",
        "x-amzn-trace-id": "Root=1-a4299e98-81e3ed92-b294-4b8ce6348c",
        "content-length": "7001",
        "accept": "application/json, text/plain, */*",
        "x-application-id": "cur8-mobile",
        "x-application-platform": "iOS",
        "x-application-version": "2.2.9",
        "sec-req-code": "6f1997afa3b7418eaddb4d10928e67b2",
        "content-type": "application/json",
        "accept-encoding": "gzip",
        "user-agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
        "cookie": "auth_user_id=8387; access_token=32f1946d-9dc4-4aa4-a122-7a94c1704a96; refresh_token=128e7474-20cb-4e4e-8866-a5281b6bc9e5"
      },
      "remoteAddress": "::ffff:10.0.159.100",
      "remotePort": 38786
    },
    "context": "DealBotService",
    "message": "Processing deal bot query",
    "dealId": "342",
    "authUserId": 8387,
    "messageLength": 88,
    "query": "Can you tell me more about the Buy and Build strategy mentioned in the deal description?"
  }

```
## 1. Query Counts per Day and per Week

### Query Identification
- A query is identified by log entries containing:
  - `"message": "Processing deal bot query"`
  - `"context": "DealBotService"`
- Each query has a timestamp in ISO format (e.g., "2025-04-02T16:39:49.520Z")
- Both cached and non-cached queries should be counted

### Implementation Approach
- Extract date from timestamp
- Group by date for daily counts
- Use date_trunc('week', timestamp) for weekly counts
- Consider downsampling for historical data if needed


## 2. Most Common Questions or Topics

### Analysis Methods
1. Exact Question Matching:
   - Group by the `query` field
   - Count frequency of identical questions
   - Simple but may miss similar questions with different wording
Needs further clearficiation on handling similar question however there is a misspelling...etc


2. Topic Analysis [dropped]:
   - Use text processing techniques (to_tsvector)
   - Extract key terms and phrases
   - Group similar questions using semantic similarity


### Implementation Considerations
- Need to handle:
  - Case sensitivity
  - Punctuation variations
  - Similar questions with different wording
  - Multi-language support if applicable

## 3. Queries with No Results or Low Satisfaction [TBD]

### Identification Methods
1. Response Analysis:
   - Check for empty or null responses
   - Look for specific error patterns
   - Monitor response confidence scores (if available)

2. Feedback Mechanisms:
   - Implement user feedback collection
   - Track explicit satisfaction ratings
   - Monitor follow-up questions

### Implementation Requirements
- Need to define clear criteria for:
  - What constitutes a "no result" query
  - What defines "low satisfaction"
  - How to handle edge cases
I already tried looking through the logs but no luck.
  - Here is what I tried
  - ```select * from logs where query is not null and "processingTimeMs" is not null  and context =  'DealBotService' and message != 'Query processed successfully';```

## 4. Average Deal Bot Response Time

### Data Source
- Use `processingTimeMs` field from logs
- Track response time at different levels:
  - Overall average
  - Time-based averages (hourly, daily, weekly)
  - Query type averages

### Implementation Details
- Calculate:
  - AVG(processingTimeMs)
  - Percentiles (90th, 95th, 99th)
