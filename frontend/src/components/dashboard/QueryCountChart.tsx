import { gql } from '@apollo/client';
import { MetricChart } from './MetricChart';

const GET_METRICS = gql`
  query GetMetrics($resolution: MetricResolution!) {
    getMetrics(query: { type: QUERY_COUNT, resolution: $resolution }) {
      values {
        metadata
        timestamp
        value
      }
    }
  }
`;

export function QueryCountChart() {
  return (
    <MetricChart
      title="Query Volume"
      description="Monitor the number of queries over time"
      query={GET_METRICS}
      variables={{
          resolution: 'DAY',
      }}
      dataKey="value"
      valueFormatter={(value) => value.toLocaleString()}
      yAxisLabel="Number of Queries"
      color="#2563eb"
      showTotal={true}
      showAverage={true}
    />
  );
} 