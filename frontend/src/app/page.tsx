'use client';

import { useQuery } from '@apollo/client';
import React, { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { GET_METRICS } from '../graphql/queries';

interface ChartSectionProps {
  title: string;
  description: string;
  type: string;
  defaultTimeRange?: string;
}

function ChartSection({ title, description, type, defaultTimeRange = 'DAY' }: ChartSectionProps) {
  const [timeRange, setTimeRange] = useState(defaultTimeRange);

  const variables = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'HOUR':
      case 'DAY':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        break;
      case 'WEEK':
        startDate = new Date(now.getTime() - 7 * 7 * 24 * 60 * 60 * 1000); // 7 weeks ago
        break;
      case 'MONTH':
        startDate = new Date(now.getTime() - 7 * 30 * 24 * 60 * 60 * 1000); // 7 months ago
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to 7 days
    }

    return {
      query: {
        type,
        resolution: timeRange,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      },
    };
  }, [timeRange, type]);

  const { loading, error, data } = useQuery(GET_METRICS, {
    variables,
    fetchPolicy: "no-cache",
  });

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center p-6 bg-red-50 rounded-lg">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Data</h2>
          <p className="text-red-500">{error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data?.getMetrics?.values) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center p-6 bg-yellow-50 rounded-lg">
          <h2 className="text-xl font-semibold text-yellow-600 mb-2">No Data Available</h2>
          <p className="text-yellow-500">The API returned no data. Please check the backend logs.</p>
        </div>
      </div>
    );
  }

  const chartData = data.getMetrics.values.map((item) => ({
    timestamp: item.timestamp,
    value: item.value,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <div className="flex gap-2">
          {['HOUR', 'DAY', 'WEEK', 'MONTH'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="timestamp"
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
              type="number"
              domain={['dataMin', 'dataMax']}
              stroke="#666"
              tick={{ fill: '#666' }}
            />
            <YAxis 
              stroke="#666"
              tick={{ fill: '#666' }}
            />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value) => [`${value} queries`, 'Count']}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 4, fill: '#2563eb', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Total</span>
          <span className="font-medium text-gray-900">
            {chartData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-gray-500">Average per {timeRange.toLowerCase()}</span>
          <span className="font-medium text-gray-900">
            {Math.round(chartData.reduce((sum, item) => sum + item.value, 0) / chartData.length).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">Monitor and analyze various metrics over time</p>
      </div>

      <div className="space-y-6">
        <ChartSection
          title="Query Volume"
          description="Monitor the number of queries over time"
          type="QUERY_COUNT"
          defaultTimeRange="DAY"
        />

        {/* <ChartSection
          title="Response Time"
          description="Track average response times"
          type="RESPONSE_TIME"
          defaultTimeRange="HOUR"
        />

        <ChartSection
          title="Error Rate"
          description="Monitor error rates and patterns"
          type="ERROR_RATE"
          defaultTimeRange="DAY"
        />

        <ChartSection
          title="Active Users"
          description="Track concurrent user sessions"
          type="ACTIVE_USERS"
          defaultTimeRange="HOUR"
        /> */}
      </div>
    </div>
  );
}
