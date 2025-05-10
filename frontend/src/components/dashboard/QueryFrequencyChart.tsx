'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { gql, useQuery } from '@apollo/client';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const GET_METRICS = gql`
  query GetMetrics($startDate: Timestamp!, $endDate: Timestamp!) {
    getMetrics(query: { 
      type: QUERY_FREQUENCY, 
      startDate: $startDate,
      endDate: $endDate
    }) {
      values {
        metadata
        timestamp
        value
      }
    }
  }
`;

export function QueryFrequencyChart() {
  // Calculate start and end dates
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDay() - 14); // One month ago

  const { loading, error, data } = useQuery(GET_METRICS, {
    variables: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    fetchPolicy: "cache-first",
    onError: (error) => {
      console.error(`Error fetching To queries data:`, error);
    },
    onCompleted: (data) => {
      console.log(`To queries data received:`, data);
    },
  });

  console.log('QueryFrequencyChart render:', { loading, error, hasData: !!data?.getMetrics?.values });

  if (loading && !data) {
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6 bg-red-50 rounded-lg">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Data</h2>
            <p className="text-red-500">{error.message}</p>
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
                  return value.length > 50 ? value.substring(0, 20) + '...' : value;
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
      </CardContent>
    </Card>
  );
} 