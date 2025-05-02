1. Expose an API that returns at **minimum**:
   1. Query counts per day and per week
   2. The most common questions or topics
   3. Queries that produced no results or low satisfaction
   4. Average Deal Bot response time

   1. Query counts per day and per week
Let's first what is considered a query? in order to be able to count it, right?
assuming that the below is considered a query, basically either it's a cached query or not, it should be treated in the count so in other words, any log statement that match the below message "Processing deal bot query" is considered a query and grouping by day will help us in answering the first req, and if by any chance another the week reslution started to be a problem later on then we can do downsampling over the data on the ingestion time, using apache nifi or airflow...
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

2. The most common questions or topics
Hmmm, assuming it's the same as the pervious query, however not sure how we will do it by topic
so most common qustions would be just grouping by query...
and for the topic we could do to_tsvector to returns each lexeme and how many times it appears


3. Queries that produced no results or low satisfaction [needs validation]
How to know it? is there is some sort of feedback or empty answer? needs further look up.


4. average deal process time
I will be relaying on "processingTimeMs" inside the log to actually filter records 