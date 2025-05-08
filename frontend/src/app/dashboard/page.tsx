import { MetricChart } from '@/components/dashboard/MetricChart';
import { QueryFrequencyChart } from '@/components/dashboard/QueryFrequencyChart';
import { gql } from '@apollo/client';

const GET_RESPONSE_TIME = gql`
  query GetMetrics {
    getMetrics(query: { type: RESPONSE_TIME, resolution: WEEK }) {
      values {
        metadata
        timestamp
        value
      }
    }
  }
`;

const GET_QUERY_COUNT = gql`
  query GetMetrics {
    getMetrics(query: { type: QUERY_COUNT, resolution: WEEK }) {
      values {
        metadata
        timestamp
        value
      }
    }
  }
`;

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricChart
          title="Response Time"
          description="Average response time in milliseconds"
          query={GET_RESPONSE_TIME}
          variables={{
            query: {
              type: 'RESPONSE_TIME',
              resolution: 'WEEK',
            },
          }}
          dataKey="value"
          valueFormatter={(value) => `${value.toFixed(2)}ms`}
          yAxisLabel="Time (ms)"
          color="#2563eb"
          showTotal={true}
          showAverage={true}
        />
        <MetricChart
          title="Query Count"
          description="Number of queries per time period"
          query={GET_QUERY_COUNT}
          variables={{
            query: {
              type: 'QUERY_COUNT',
              resolution: 'WEEK',
            },
          }}
          dataKey="value"
          valueFormatter={(value) => value.toString()}
          yAxisLabel="Count"
          color="#16a34a"
          showTotal={true}
          showAverage={true}
        />
      </div>
      <div className="mt-6">
        <QueryFrequencyChart />
      </div>
    </div>
  );
} 