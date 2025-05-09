'use client';
import { gql } from '@apollo/client';
import { MetricChart } from './MetricChart';

const GET_METRICS = gql`
  query GetMetrics($resolution: MetricResolution!) {
    getMetrics(query: { type: RESPONSE_TIME, resolution: $resolution }) {
      values {
        metadata
        timestamp
        value
      }
    }
  }
`;

export function ResponseTimeChart() {
  return (
    <MetricChart
      title="Response Time Analysis"
      description="Track average response times and percentiles"
      query={GET_METRICS}
      variables={{
          resolution: 'WEEK',
      }}
      dataKey="value"
      valueFormatter={(value) => `${Math.round(value)}ms`}
      yAxisLabel="Response Time (ms)"
      color="#8884d8"
      showTotal={false}
      showAverage={true}
      additionalLines={[
        {
          dataKey: 'p50',
          name: 'P50',
          color: '#82ca9d',
        },
        {
          dataKey: 'p90',
          name: 'P90',
          color: '#ff8042',
        },
      ]}
    />
  );
} 