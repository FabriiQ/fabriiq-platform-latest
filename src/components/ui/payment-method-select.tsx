'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  PaymentMethod,
  PaymentMethodCategory,
  getPaymentMethodOptions,
  getPaymentMethodsByCategory,
  getPaymentMethodLabel,
  getPaymentMethodIcon,
  PopularPaymentMethods,
} from '@/types/payment-methods';

interface PaymentMethodSelectProps {
  value?: PaymentMethod;
  onValueChange: (value: PaymentMethod) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showCategories?: boolean;
  showPopularFirst?: boolean;
}

export function PaymentMethodSelect({
  value,
  onValueChange,
  placeholder = 'Select payment method...',
  disabled = false,
  className,
  showCategories = true,
  showPopularFirst = true,
}: PaymentMethodSelectProps) {
  const [open, setOpen] = React.useState(false);
  const options = getPaymentMethodOptions();

  const renderPaymentMethods = () => {
    if (!showCategories) {
      return (
        <CommandGroup>
          {options.map((option) => (
            <CommandItem
              key={option.value}
              value={option.value}
              onSelect={(currentValue) => {
                onValueChange(currentValue as PaymentMethod);
                setOpen(false);
              }}
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="text-lg">{option.icon}</span>
                <div className="flex flex-col">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </div>
              </div>
              <Check
                className={cn(
                  'ml-auto h-4 w-4',
                  value === option.value ? 'opacity-100' : 'opacity-0'
                )}
              />
            </CommandItem>
          ))}
        </CommandGroup>
      );
    }

    const popularMethods = showPopularFirst 
      ? options.filter(opt => PopularPaymentMethods.includes(opt.value))
      : [];
    
    const otherMethods = showPopularFirst
      ? options.filter(opt => !PopularPaymentMethods.includes(opt.value))
      : options;

    const categories = Object.values(PaymentMethodCategory);

    return (
      <>
        {showPopularFirst && popularMethods.length > 0 && (
          <CommandGroup heading="Popular Methods">
            {popularMethods.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={(currentValue) => {
                  onValueChange(currentValue as PaymentMethod);
                  setOpen(false);
                }}
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-lg">{option.icon}</span>
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </div>
                <Check
                  className={cn(
                    'ml-auto h-4 w-4',
                    value === option.value ? 'opacity-100' : 'opacity-0'
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {categories.map((category) => {
          const categoryMethods = getPaymentMethodsByCategory(category);
          const categoryOptions = otherMethods.filter(opt => 
            categoryMethods.includes(opt.value)
          );

          if (categoryOptions.length === 0) return null;

          const categoryLabels = {
            [PaymentMethodCategory.DIGITAL]: 'Digital Wallets',
            [PaymentMethodCategory.CARD]: 'Card Payments',
            [PaymentMethodCategory.CASH]: 'Cash Payments',
            [PaymentMethodCategory.BANK]: 'Bank Transfers',
          };

          return (
            <CommandGroup key={category} heading={categoryLabels[category]}>
              {categoryOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue as PaymentMethod);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-lg">{option.icon}</span>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </div>
                  <Check
                    className={cn(
                      'ml-auto h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
          disabled={disabled}
        >
          {value ? (
            <div className="flex items-center gap-2">
              <span className="text-lg">{getPaymentMethodIcon(value)}</span>
              <span>{getPaymentMethodLabel(value)}</span>
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search payment methods..." />
          <CommandEmpty>No payment method found.</CommandEmpty>
          {renderPaymentMethods()}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Simple select variant for forms
interface PaymentMethodSimpleSelectProps {
  value?: PaymentMethod;
  onValueChange: (value: PaymentMethod) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PaymentMethodSimpleSelect({
  value,
  onValueChange,
  placeholder = 'Select payment method...',
  disabled = false,
  className,
}: PaymentMethodSimpleSelectProps) {
  const options = getPaymentMethodOptions();

  return (
    <select
      value={value || ''}
      onChange={(e) => onValueChange(e.target.value as PaymentMethod)}
      disabled={disabled}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      <option value="select-payment-method" disabled>
        {placeholder}
      </option>
      {PopularPaymentMethods.map((method) => {
        const option = options.find(opt => opt.value === method);
        if (!option) return null;
        return (
          <option key={method} value={method}>
            {option.icon} {option.label}
          </option>
        );
      })}
      <optgroup label="Other Methods">
        {options
          .filter(opt => !PopularPaymentMethods.includes(opt.value))
          .map((option) => (
            <option key={option.value} value={option.value}>
              {option.icon} {option.label}
            </option>
          ))}
      </optgroup>
    </select>
  );
}
