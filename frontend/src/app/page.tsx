'use client';

import { QueryCountChart } from '@/components/dashboard/QueryCountChart';
import { ResponseTimeChart } from '@/components/dashboard/ResponseTimeChart';
import { QueryFrequencyChart } from '@/components/dashboard/QueryFrequencyChart';


export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <QueryCountChart />
          <ResponseTimeChart />
        </div>
        <div className="grid grid-cols-1 gap-6">
        <QueryFrequencyChart />
        </div>
      </div>
    </main>
  );
}
