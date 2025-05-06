# Islamic Finance Guru API

This is the backend API for the Islamic Finance Guru application, built with NestJS, GraphQL, and PostgreSQL.

## Features

- GraphQL API with Apollo Server
- PostgreSQL database integration with TypeORM
- Log search functionality
- Metrics tracking
- Input validation
- Environment-based configuration

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL
- Docker (optional)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=dealbot
NODE_ENV=development
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000/graphql`

## Docker Setup

To run the API using Docker:

```bash
docker-compose up api
```

## Development

- `npm run start` - Start the production server
- `npm run start:dev` - Start the development server with hot-reload
- `npm run build` - Build the application
- `npm run test` - Run tests
- `npm run lint` - Run linting

## API Documentation

Once the server is running, you can access the GraphQL playground at `http://localhost:3000/graphql` to explore the API schema and test queries.

## Database Migrations

The application uses TypeORM's automatic synchronization in development mode. For production, you should use migrations:

```bash
npm run typeorm migration:generate
npm run typeorm migration:run
```

## Metric Queries

The API provides a flexible querying system for metrics through the `BaseMetricProcessor`. Here are some examples of how to use it:

### Basic Query
```typescript
const query: MetricQuery = {
  type: MetricType.SUMMARY,
  resolution: 'DAY',
};
```

### Query with Date Range
```typescript
const query: MetricQuery = {
  type: MetricType.SUMMARY,
  resolution: 'DAY',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
};
```

### Query with Filters
```typescript
const query: MetricQuery = {
  type: MetricType.SUMMARY,
  resolution: 'DAY',
  filters: [
    {
      field: FilterField.INTENT,
      operator: FilterOperator.EQUALS,
      value: 'greeting',
    },
    {
      field: FilterField.TOPIC,
      operator: FilterOperator.CONTAINS,
      value: 'finance',
    },
  ],
};
```

### Query with Pagination
```typescript
const query: MetricQuery = {
  type: MetricType.SUMMARY,
  resolution: 'DAY',
  pagination: {
    offset: 20,
    limit: 50,
  },
};
```

### Available Filter Fields
- `MESSAGE`: The log message
- `CONTENT`: The log content
- `CONTEXT`: The log context
- `INTENT`: The intent from the query
- `TOPIC`: The topic from the query

### Available Filter Operators
- `EQUALS`: Exact match
- `CONTAINS`: Case-insensitive contains
- `STARTS_WITH`: Case-insensitive starts with
- `ENDS_WITH`: Case-insensitive ends with

### Available Resolutions
- `HOUR`: Hourly aggregation
- `DAY`: Daily aggregation
- `WEEK`: Weekly aggregation
- `MONTH`: Monthly aggregation
