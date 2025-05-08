import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { gql, useQuery } from '@apollo/client';
import { format } from 'date-fns';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const GET_METRICS = gql`
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

interface ResponseTimeData {
  timestamp: number;
  value: number;
  metadata: {
    p50: number;
    p90: number;
  };
}

export function ResponseTimeChart() {
  const { loading, error, data } = useQuery(GET_METRICS);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const chartData = data.getMetrics.values.map((item: ResponseTimeData) => ({
    date: format(new Date(item.timestamp), 'MMM dd'),
    average: Math.round(item.value),
    p50: Math.round(item.metadata.p50),
    p90: Math.round(item.metadata.p90),
  }));

  return (
    <Card className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
      <CardHeader>
        <CardTitle>Response Time Analysis in ms</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis 
                label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }}
                domain={[0, 'dataMax + 1000']}
              />
              <Tooltip 
                formatter={(value: number) => [`${value}ms`, '']}
                labelFormatter={(label) => `Week of ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="average" 
                stroke="#8884d8" 
                name="Average Response Time"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="p50" 
                stroke="#82ca9d" 
                name="50th Percentile"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="p90" 
                stroke="#ffc658" 
                name="90th Percentile"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 