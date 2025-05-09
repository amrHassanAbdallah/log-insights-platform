'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { gql, useQuery } from '@apollo/client';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TimeRangeSelector } from './TimeRangeSelector';

const GET_METRICS = gql`
  query GetMetrics($resolution: MetricResolution!) {
    getMetrics(query: { type: QUERY_FREQUENCY, resolution: $resolution }) {
      values {
        metadata
        timestamp
        value
      }
    }
  }
`;

export function QueryFrequencyChart() {
  const [timeRange, setTimeRange] = useState('MONTH');

  const { loading, error, data, refetch } = useQuery(GET_METRICS, {
    variables: {
      resolution: timeRange,
    },
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    refetch();
  }, [timeRange, refetch]);

  if (loading) {
    return (
      <Card className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top Questions</CardTitle>
              <p className="text-sm text-muted-foreground">Most frequently asked questions</p>
            </div>
            <TimeRangeSelector timeRange={timeRange} onTimeRangeChange={setTimeRange} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading metrics...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top Questions</CardTitle>
              <p className="text-sm text-muted-foreground">Most frequently asked questions</p>
            </div>
            <TimeRangeSelector timeRange={timeRange} onTimeRangeChange={setTimeRange} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6 bg-red-50 rounded-lg">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Data</h2>
            <p className="text-red-500">{error.message}</p>
            <div className="mt-4 space-y-2">
              <button 
                onClick={() => refetch()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.getMetrics?.values || data?.getMetrics?.values.length === 0) {
    return (
      <Card className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top Questions</CardTitle>
              <p className="text-sm text-muted-foreground">Most frequently asked questions</p>
            </div>
            <TimeRangeSelector timeRange={timeRange} onTimeRangeChange={setTimeRange} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6 bg-yellow-50 rounded-lg">
            <h2 className="text-xl font-semibold text-yellow-600 mb-2">No Data Available</h2>
            <p className="text-yellow-500">No query frequency data available.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.getMetrics.values.map((item: any) => ({
    query: item.metadata.query,
    count: item.value,
  }));

  return (
    <Card className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Top Questions</CardTitle>
            <p className="text-sm text-muted-foreground">Most frequently asked questions</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" stroke="#666" tick={{ fill: '#666' }} />
              <YAxis
                type="category"
                dataKey="query"
                width={180}
                stroke="#666"
                tick={{ fill: '#666' }}
                tickFormatter={(value) => {
                  // Truncate long questions and add ellipsis
                  return value.length > 50 ? value.substring(0, 50) + '...' : value;
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value: number) => [`${value} times`, 'Frequency']}
                labelFormatter={(label) => label}
              />
              <Bar
                dataKey="count"
                fill="#2563eb"
                radius={[0, 4, 4, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>
        </div>
      </CardContent>
    </Card>
  );
} 