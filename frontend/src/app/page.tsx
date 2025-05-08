'use client';

import { QueryCountChart } from '@/components/dashboard/QueryCountChart';
import { ResponseTimeChart } from '@/components/dashboard/ResponseTimeChart';
import { useQuery } from '@apollo/client';
import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { GET_METRICS } from '../graphql/queries';


export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <QueryCountChart />
          <ResponseTimeChart />
        </div>
      </div>
    </main>
  );
}
