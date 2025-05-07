import { gql } from '@apollo/client';

export const GET_METRICS = gql`
  query GetMetrics($query: MetricQuery!) {
    getMetrics(query: $query) {
      values {
        timestamp
        value
        metadata
      }
    }
  }
`; 