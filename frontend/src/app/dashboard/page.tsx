import { QueryCountChart } from '@/components/dashboard/QueryCountChart';
import { QueryFrequencyChart } from '@/components/dashboard/QueryFrequencyChart';
import { ResponseTimeChart } from '@/components/dashboard/ResponseTimeChart';

export default function DashboardPage() {
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