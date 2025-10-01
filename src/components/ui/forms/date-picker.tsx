"use client";

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/atoms/button';
import { Calendar } from '~/components/ui/forms/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/atoms/popover';

export interface DatePickerProps {
  date?: Date;
  setDate?: (date?: Date) => void;
  selected?: Date;
  onSelect?: (date?: Date) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  date,
  setDate,
  selected,
  onSelect,
  placeholder = 'Pick a date',
  className,
  disabled = false,
}: DatePickerProps) {
  // Support both interfaces for backward compatibility
  const currentDate = selected || date;
  const handleDateChange = onSelect || setDate;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {currentDate ? format(currentDate, 'PPP') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={currentDate}
          onSelect={handleDateChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
} 