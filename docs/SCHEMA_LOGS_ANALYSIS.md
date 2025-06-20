# JSONB vs Fully Normalized Schema for Log Storage

When you are uncertain which log fields will appear and log formats may evolve, you have two main patterns:

1. **JSONB storage (schema-on-read)**  
2. **Fully normalized columns (schema-on-write)**

## Comparison

| Criteria                    | JSONB Column                                              | Fully Normalized Columns                                |
|-----------------------------|-----------------------------------------------------------|---------------------------------------------------------|
| Flexibility                 | Store any new or unexpected fields without schema changes | Requires schema changes (ALTER TABLE) for new fields    |
| Ingestion effort            | No migrations required                                    | Migrations required for every new field                 |
| Query performance           | JSONB lookups are slower than native columns              | Native columns with B-tree indexes are very fast        |
| Type safety and enforcement | Loose, validated at runtime                               | Strict types and constraints enforced by the database   |
| Indexing complexity         | One GIN/GiST index per JSON path                          | Standard B-tree indexes on columns                      |
| Storage efficiency          | Some JSON overhead                                        | Fixed columns are more compact                          |
| Handling evolving fields    | Zero-downtime for new fields                              | Requires downtime or migrations                         |
| Ad-hoc analytics            | Uses JSON functions, more complex queries                 | Standard SQL queries are straightforward                |

## Pros and Cons

### JSONB storage

**Pros**  
- Maximum flexibility: any field can be stored without altering the schema  
- Quick to onboard: a single column holds all log data  
- Complete data capture: no risk of dropping unexpected properties  

**Cons**  
- Slower queries for JSON path lookups  
- No compile-time type checking  
- Index management is required for each JSON path you query  

### Fully normalized columns

**Pros**  
- High performance: native columns and B-tree indexes deliver fast queries  
- Strong typing and constraints in the database  
- Simple analytics: standard SQL makes aggregations trivial  

**Cons**  
- Rigid schema: every new log field requires a migration and deployment  
- Sparse or nullable columns if fields are optional  
- Upfront design work to anticipate core fields  

## Hybrid approach (Picked)

1. **Normalize core fields** you will always query (e.g. `timestamp`, `auth_user_id`, `url`, `method`, `response_time_ms`, `status_code`).  
2. **Keep a catch-all `jsonb raw` column** for all other, evolving or rare fields.  
3. **Index JSONB paths** you query frequently, and promote hot JSON paths into native columns as usage patterns stabilize.

### Example schema

```sql
CREATE TABLE logs (
  id SERIAL PRIMARY KEY,
  timestamp        TIMESTAMPTZ NOT NULL,
  auth_user_id     INT,
  url              TEXT NOT NULL,
  method           TEXT NOT NULL,
  response_time_ms INT,
  status_code      INT,
  raw              JSONB,
  -- native indexes
  INDEX idx_logs_timestamp  (timestamp),
  INDEX idx_logs_user_id    (auth_user_id),
  INDEX idx_logs_url        (url),
  -- JSONB index for a frequently queried path
  INDEX idx_logs_error_code ((raw->>'errorCode'))
);