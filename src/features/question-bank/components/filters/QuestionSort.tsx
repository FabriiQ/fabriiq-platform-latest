'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';

// Simple sort fields - moved outside to prevent recreation
const SORT_FIELDS = [
  { value: 'title', label: 'Title' },
  { value: 'createdAt', label: 'Created Date' },
  { value: 'updatedAt', label: 'Updated Date' },
  { value: 'difficulty', label: 'Difficulty' },
  { value: 'year', label: 'Year' },
] as const;

interface QuestionSortProps {
  value: {
    field: 'title' | 'createdAt' | 'updatedAt' | 'difficulty' | 'year';
    direction: 'asc' | 'desc';
  };
  onChange: (value: QuestionSortProps['value']) => void;
  className?: string;
}

/**
 * Question Sort Component - Simple dropdown-free version to avoid infinite re-renders
 *
 * This component provides sorting options for questions in the question bank.
 */
export const QuestionSort: React.FC<QuestionSortProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const currentField = value?.field || 'createdAt';
  const currentDirection = value?.direction || 'desc';

  // Get current field label
  const currentFieldLabel = SORT_FIELDS.find(f => f.value === currentField)?.label || 'Created Date';

  // Simple handlers without complex memoization
  const handleFieldClick = () => {
    // Cycle through sort fields
    const currentIndex = SORT_FIELDS.findIndex(f => f.value === currentField);
    const nextIndex = (currentIndex + 1) % SORT_FIELDS.length;
    const nextField = SORT_FIELDS[nextIndex];

    onChange({
      field: nextField.value,
      direction: currentDirection,
    });
  };

  const handleDirectionClick = () => {
    onChange({
      field: currentField,
      direction: currentDirection === 'asc' ? 'desc' : 'asc',
    });
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Simple button to cycle through sort fields */}
      <Button
        variant="outline"
        onClick={handleFieldClick}
        className="min-w-[140px] justify-between"
        title="Click to change sort field"
      >
        <span className="text-sm">{currentFieldLabel}</span>
        <ChevronDown className="h-4 w-4 ml-2" />
      </Button>

      {/* Direction toggle button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleDirectionClick}
        title={currentDirection === 'asc' ? 'Ascending - Click for Descending' : 'Descending - Click for Ascending'}
      >
        {currentDirection === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};

QuestionSort.displayName = 'QuestionSort';

export default QuestionSort;
