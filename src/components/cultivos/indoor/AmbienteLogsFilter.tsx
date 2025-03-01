import { useState } from 'react';

type FilterRange = '3h' | '12h' | '1d' | '1w' | '1m' | '3m' | 'all';

interface Props {
  onFilterChange: (filteredLogs: any[]) => void;
  logs: any[];
}

function AmbienteLogsFilter({ onFilterChange, logs }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterRange>('all');

  const applyFilter = (range: FilterRange) => {
    setActiveFilter(range);
    
    if (range === 'all' || logs.length === 0) {
      onFilterChange(logs);
      return;
    }
    
    const now = new Date();
    let filterDate = new Date(now);
    
    switch (range) {
      case '3h':
        filterDate.setHours(now.getHours() - 3);
        break;
      case '12h':
        filterDate.setHours(now.getHours() - 12);
        break;
      case '1d':
        filterDate.setDate(now.getDate() - 1);
        break;
      case '1w':
        filterDate.setDate(now.getDate() - 7);
        break;
      case '1m':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      case '3m':
        filterDate.setMonth(now.getMonth() - 3);
        break;
    }
    
    const filteredLogs = logs.filter(log => 
      new Date(log.timestamp) >= filterDate
    );
    
    onFilterChange(filteredLogs);
  };

  const filterOptions = [
    { value: '3h', label: '3h' },
    { value: '12h', label: '12h' },
    { value: '1d', label: '1d' },
    { value: '1w', label: '1s' },
    { value: '1m', label: '1m' },
    { value: '3m', label: '3m' },
    { value: 'all', label: 'Todo' }
  ];

  return (
    <div className="text-xs mb-4">
      <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
        {filterOptions.map(option => (
          <button
            key={option.value}
            onClick={() => applyFilter(option.value as FilterRange)}
            className={`px-2 py-1 text-sm rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
              activeFilter === option.value
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default AmbienteLogsFilter; 