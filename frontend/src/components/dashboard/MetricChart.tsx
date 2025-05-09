'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@apollo/client';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TimeRangeSelector } from './TimeRangeSelector';

interface AdditionalLine {
  dataKey: string;
  name: string;
  color: string;
}


interface MetricChartProps {
  title: string;
  description: string;
  query: any;
  variables: {
      resolution: string;
  };
  dataKey: string;
  valueFormatter?: (value: number) => string;
  yAxisLabel?: string;
  color?: string;
  showTotal?: boolean;
  showAverage?: boolean;
  additionalLines?: AdditionalLine[];
}

interface ChartDataItem {
  timestamp: number;
  value: number;
  [key: string]: any;
}

export function MetricChart({
  title,
  description,
  query,
  variables,
  dataKey,
  valueFormatter = (value) => value.toString(),
  yAxisLabel,
  color = '#2563eb',
  showTotal = true,
  showAverage = true,
  additionalLines = [],
}: MetricChartProps) {
  const [timeRange, setTimeRange] = useState<string>(variables.resolution);
  const [retryCount, setRetryCount] = useState(0);

  const { loading, error, data, refetch } = useQuery(query, {
    variables: {
      ...variables,
      resolution: timeRange,
    },
    fetchPolicy: "cache-and-network",
    onError: (error) => {
      console.error(`Error fetching ${title} data:`, error);
    },
    onCompleted: (data) => {
      console.log(`${title} data received:`, data);
    },
  });

  useEffect(() => {
    console.log(`${title} loading state:`, loading);
    console.log(`${title} error state:`, error);
    console.log(`${title} data state:`, data);
  }, [loading, error, data, title]);

  useEffect(() => {
    refetch();
  }, [timeRange, refetch]);

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    try {
      await refetch();
    } catch (error) {
      console.error(`Error retrying ${title} chart:`, error);
    }
  };

  if (loading && !data) {
    return (
      <Card className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <p className="text-sm text-muted-foreground">{description}</p>
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <p className="text-sm text-muted-foreground">{description}</p>
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
                onClick={handleRetry}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
              {retryCount > 0 && (
                <p className="text-sm text-gray-500">Retry attempt: {retryCount}</p>
              )}
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
              <CardTitle>{title}</CardTitle>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <TimeRangeSelector timeRange={timeRange} onTimeRangeChange={setTimeRange} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6 bg-yellow-50 rounded-lg">
            <h2 className="text-xl font-semibold text-yellow-600 mb-2">No Data Available</h2>
            <p className="text-yellow-500">The API returned no data. Please check the backend logs.</p>
            <div className="mt-4 space-y-2">
              <button 
                onClick={handleRetry}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Retry
              </button>
              {retryCount > 0 && (
                <p className="text-sm text-gray-500">Retry attempt: {retryCount}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData: ChartDataItem[] = data.getMetrics.values.map((item: any) => ({
    timestamp: item.timestamp,
    value: item.value,
    ...item.metadata,
  }));

  return (
    <Card className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <TimeRangeSelector timeRange={timeRange} onTimeRangeChange={setTimeRange} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="timestamp"
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                type="number"
                domain={['dataMin', 'dataMax']}
                stroke="#666"
                tick={{ fill: '#666' }}
              />
              <YAxis 
                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
                stroke="#666"
                tick={{ fill: '#666' }}
              />
              <Tooltip 
                labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                formatter={(value) => [valueFormatter(Number(value)), '']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={dataKey}
                name="Average"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 4, fill: color, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={true}
              />
              {additionalLines.map((line) => (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={{ r: 4, fill: line.color, strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: line.color, stroke: '#fff', strokeWidth: 2 }}
                  isAnimationActive={true}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {(showTotal || showAverage) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {showTotal && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Total</span>
                <span className="font-medium text-gray-900">
                  {valueFormatter(chartData.reduce((sum: number, item: ChartDataItem) => sum + item.value, 0))}
                </span>
              </div>
            )}
            {showAverage && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-500">Average per {timeRange.toLowerCase()}</span>
                <span className="font-medium text-gray-900">
                  {valueFormatter(Math.round(chartData.reduce((sum: number, item: ChartDataItem) => sum + item.value, 0) / chartData.length))}
                </span>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleRetry}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

