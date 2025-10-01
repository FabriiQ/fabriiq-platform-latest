'use client';

import React from 'react';
import { BloomsTaxonomyLevel } from '../../types';
import { BLOOMS_LEVEL_METADATA, ORDERED_BLOOMS_LEVELS } from '../../constants/bloom-levels';

interface MasteryRadarChartProps {
  data: Record<BloomsTaxonomyLevel, number>;
  size?: number;
  showLabels?: boolean;
  showValues?: boolean;
  color?: string;
  compareData?: Record<BloomsTaxonomyLevel, number>;
  compareColor?: string;
}

/**
 * Component for visualizing mastery across Bloom's levels as a radar chart
 */
export function MasteryRadarChart({
  data,
  size = 300,
  showLabels = true,
  showValues = true,
  color = '#3b82f6', // Blue
  compareData,
  compareColor = '#ef4444', // Red
}: MasteryRadarChartProps) {
  // SVG dimensions - improved spacing for better label visibility
  const center = size / 2;
  const radius = size * 0.35; // Reduced radius to make more room for labels
  const labelRadius = radius * 1.4; // Increased label distance for better visibility
  
  // Calculate points for each level
  const calculatePoints = (data: Record<BloomsTaxonomyLevel, number>) => {
    return ORDERED_BLOOMS_LEVELS.map((level, index) => {
      const value = data[level] || 0;
      const normalizedValue = value / 100; // Normalize to 0-1
      const angle = (index / ORDERED_BLOOMS_LEVELS.length) * Math.PI * 2 - Math.PI / 2;
      
      return {
        level,
        value,
        x: center + radius * normalizedValue * Math.cos(angle),
        y: center + radius * normalizedValue * Math.sin(angle),
        labelX: center + labelRadius * Math.cos(angle),
        labelY: center + labelRadius * Math.sin(angle),
        angle,
      };
    });
  };
  
  // Calculate points
  const points = calculatePoints(data);
  const comparePoints = compareData ? calculatePoints(compareData) : null;
  
  // Create polygon points string
  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const comparePolygonPoints = comparePoints?.map(p => `${p.x},${p.y}`).join(' ');
  
  // Create axis lines
  const axisLines = points.map(p => ({
    x1: center,
    y1: center,
    x2: center + radius * Math.cos(p.angle),
    y2: center + radius * Math.sin(p.angle),
  }));
  
  // Create concentric circles
  const circles = [0.25, 0.5, 0.75, 1].map(factor => ({
    cx: center,
    cy: center,
    r: radius * factor,
  }));
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background circles */}
      {circles.map((circle, i) => (
        <circle
          key={i}
          cx={circle.cx}
          cy={circle.cy}
          r={circle.r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
          strokeDasharray={i < circles.length - 1 ? "2 2" : ""}
        />
      ))}
      
      {/* Axis lines */}
      {axisLines.map((line, i) => (
        <line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}
      
      {/* Compare data polygon */}
      {comparePoints && (
        <polygon
          points={comparePolygonPoints}
          fill={`${compareColor}40`} // 40% opacity
          stroke={compareColor}
          strokeWidth="2"
        />
      )}
      
      {/* Main data polygon */}
      <polygon
        points={polygonPoints}
        fill={`${color}40`} // 40% opacity
        stroke={color}
        strokeWidth="2"
      />
      
      {/* Data points */}
      {points.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r="4"
          fill={color}
        />
      ))}
      
      {/* Compare data points */}
      {comparePoints?.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r="4"
          fill={compareColor}
        />
      ))}
      
      {/* Labels */}
      {showLabels && points.map((point, i) => {
        const metadata = BLOOMS_LEVEL_METADATA[point.level];

        // Improved text anchor calculation for better centering
        let textAnchor: 'start' | 'middle' | 'end' = 'middle';
        if (point.angle > -Math.PI / 6 && point.angle < Math.PI / 6) {
          textAnchor = 'start'; // Right side
        } else if (point.angle > 5 * Math.PI / 6 || point.angle < -5 * Math.PI / 6) {
          textAnchor = 'end'; // Left side
        }

        // Improved vertical alignment
        let dy = '0.3em';
        if (point.angle > -Math.PI / 3 && point.angle < -2 * Math.PI / 3) {
          dy = '-0.5em'; // Top
        } else if (point.angle > Math.PI / 3 && point.angle < 2 * Math.PI / 3) {
          dy = '1em'; // Bottom
        }

        return (
          <g key={i}>
            {/* Background for better readability */}
            <rect
              x={point.labelX - (textAnchor === 'middle' ? 25 : textAnchor === 'start' ? 0 : 50)}
              y={point.labelY - 8}
              width={50}
              height={16}
              fill="rgba(255, 255, 255, 0.9)"
              stroke="rgba(0, 0, 0, 0.1)"
              strokeWidth="0.5"
              rx="2"
            />
            <text
              x={point.labelX}
              y={point.labelY}
              textAnchor={textAnchor}
              dy={dy}
              fontSize="11"
              fill={metadata.color}
              fontWeight="600"
            >
              {metadata.name}
            </text>
            {showValues && (
              <text
                x={point.labelX}
                y={point.labelY + 12}
                textAnchor={textAnchor}
                dy={dy}
                fontSize="10"
                fill="#666"
                fontWeight="500"
              >
                ({Math.round(point.value)}%)
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
