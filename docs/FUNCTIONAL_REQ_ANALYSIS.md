# Functional Requirements Analysis

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
- Can be implemented using:
  - Time-series database (e.g., TimescaleDB)
  - Data warehouse solution
  - Real-time processing pipeline

## 2. Most Common Questions or Topics

### Analysis Methods
1. Exact Question Matching:
   - Group by the `query` field
   - Count frequency of identical questions
   - Simple but may miss similar questions with different wording

2. Topic Analysis:
   - Use text processing techniques (to_tsvector)
   - Extract key terms and phrases
   - Group similar questions using semantic similarity
   - More sophisticated but requires NLP processing

### Implementation Considerations
- Need to handle:
  - Case sensitivity
  - Punctuation variations
  - Similar questions with different wording
  - Multi-language support if applicable

## 3. Queries with No Results or Low Satisfaction

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

## 4. Average Deal Bot Response Time

### Data Source
- Use `processingTimeMs` field from logs
- Track response time at different levels:
  - Overall average
  - Time-based averages (hourly, daily, weekly)
  - Query type averages

### Implementation Details
- Calculate:
  - Mean response time
  - Median response time
  - Percentiles (90th, 95th, 99th)
  - Response time trends over time
