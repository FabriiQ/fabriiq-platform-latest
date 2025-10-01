'use client';

import { useMemo } from 'react';

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: ChartData[];
  height?: number;
  className?: string;
}

export function SimpleBarChart({ data, height = 200, className = '' }: SimpleBarChartProps) {
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value)), [data]);
  
  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <div className="flex items-end justify-between h-full gap-2 p-4">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1 h-full">
            <div className="flex-1 flex items-end w-full">
              <div
                className={`w-full rounded-t-md transition-all duration-300 ${
                  item.color || 'bg-blue-500'
                }`}
                style={{
                  height: `${(item.value / maxValue) * 80}%`,
                  minHeight: '4px'
                }}
              />
            </div>
            <div className="mt-2 text-xs text-center text-muted-foreground">
              <div className="font-medium">{item.label}</div>
              <div className="text-xs">{(item.value ?? 0).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SimplePieChartProps {
  data: ChartData[];
  size?: number;
  className?: string;
}

export function SimplePieChart({ data, size = 200, className = '' }: SimplePieChartProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  
  let cumulativePercentage = 0;
  const segments = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const startAngle = cumulativePercentage * 3.6; // Convert to degrees
    const endAngle = (cumulativePercentage + percentage) * 3.6;
    cumulativePercentage += percentage;
    
    return {
      ...item,
      percentage,
      startAngle,
      endAngle,
      color: item.color || `hsl(${index * 60}, 70%, 50%)`
    };
  });

  const radius = size / 2 - 10;
  const center = size / 2;

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {segments.map((segment, index) => {
          const largeArcFlag = segment.percentage > 50 ? 1 : 0;
          const startX = center + radius * Math.cos((segment.startAngle * Math.PI) / 180);
          const startY = center + radius * Math.sin((segment.startAngle * Math.PI) / 180);
          const endX = center + radius * Math.cos((segment.endAngle * Math.PI) / 180);
          const endY = center + radius * Math.sin((segment.endAngle * Math.PI) / 180);

          const pathData = [
            `M ${center} ${center}`,
            `L ${startX} ${startY}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            'Z'
          ].join(' ');

          return (
            <path
              key={index}
              d={pathData}
              fill={segment.color}
              className="transition-opacity hover:opacity-80"
            />
          );
        })}
      </svg>
      
      <div className="flex flex-col gap-2">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-muted-foreground">{segment.label}</span>
            <span className="font-medium">
              {segment.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SimpleLineChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  className?: string;
}

export function SimpleLineChart({ data, height = 200, className = '' }: SimpleLineChartProps) {
  // Ensure data is valid and has values
  const validData = data.filter(item => item && typeof item.value === 'number' && !isNaN(item.value));

  // If no valid data, show empty state
  if (validData.length === 0) {
    return (
      <div className={`w-full flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-muted-foreground text-sm">No data available</p>
      </div>
    );
  }

  const maxValue = useMemo(() => Math.max(...validData.map(d => d.value)), [validData]);
  const minValue = useMemo(() => Math.min(...validData.map(d => d.value)), [validData]);
  const range = maxValue - minValue || 1; // Prevent division by zero

  const points = validData.map((item, index) => {
    const x = validData.length > 1 ? (index / (validData.length - 1)) * 100 : 50;
    const y = range > 0 ? 100 - (((item.value) - minValue) / range) * 80 : 50;
    return { x, y, ...item };
  });

  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" className="overflow-visible">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="currentColor"
            strokeWidth="0.1"
            className="text-muted-foreground/20"
          />
        ))}
        
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke="rgb(59, 130, 246)"
          strokeWidth="0.5"
          className="transition-all duration-300"
        />
        
        {/* Points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="0.8"
            fill="rgb(59, 130, 246)"
            className="transition-all duration-300 hover:r-1"
          />
        ))}
      </svg>
      
      {/* Labels */}
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        {validData.map((item, index) => (
          <div key={index} className="text-center">
            <div>{item.label || 'N/A'}</div>
            <div className="font-medium">
              {typeof item.value === 'number' && !isNaN(item.value)
                ? item.value.toLocaleString()
                : '0'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
