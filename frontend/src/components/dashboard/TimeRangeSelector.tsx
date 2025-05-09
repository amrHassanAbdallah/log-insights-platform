'use client';

interface TimeRangeSelectorProps {
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
}

/**
 * TimeRangeSelector component for selecting the downsampling resolution of metrics data.
 * This controls how the data is aggregated (e.g., hourly, daily, weekly, monthly).
 */
export function TimeRangeSelector({ timeRange, onTimeRangeChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm text-gray-500">
        Downsampling Resolution
      </div>
      <div className="flex gap-2">
        {(['HOUR', 'DAY', 'WEEK', 'MONTH'] as string[]).map((range) => (
          <button
            key={range}
            onClick={() => onTimeRangeChange(range)}
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
  );
} 