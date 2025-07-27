import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from 'date-fns';

export default function DateRangeSelector({ onDateRangeChange, currentRange }) {
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  const predefinedRanges = [
    {
      label: 'Last 7 Days',
      key: 'last7days',
      getRange: () => ({
        start: subDays(new Date(), 7),
        end: new Date()
      })
    },
    {
      label: 'Last 30 Days',
      key: 'last30days',
      getRange: () => ({
        start: subDays(new Date(), 30),
        end: new Date()
      })
    },
    {
      label: 'This Month',
      key: 'thismonth',
      getRange: () => ({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
      })
    },
    {
      label: 'Last Month',
      key: 'lastmonth',
      getRange: () => {
        const lastMonth = subMonths(new Date(), 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      }
    },
    {
      label: 'This Year',
      key: 'thisyear',
      getRange: () => ({
        start: startOfYear(new Date()),
        end: endOfYear(new Date())
      })
    }
  ];

  const handlePredefinedRange = (range) => {
    const { start, end } = range.getRange();
    onDateRangeChange({ start, end, label: range.label });
    setCustomStartDate(null);
    setCustomEndDate(null);
  };

  const handleCustomRange = () => {
    if (customStartDate && customEndDate) {
      onDateRangeChange({ 
        start: customStartDate, 
        end: customEndDate, 
        label: `${format(customStartDate, 'MMM d')} - ${format(customEndDate, 'MMM d, yyyy')}` 
      });
    }
  };

  const clearCustomDates = () => {
    setCustomStartDate(null);
    setCustomEndDate(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Predefined Range Buttons */}
      <div className="flex flex-wrap gap-2">
        {predefinedRanges.map((range) => (
          <Button
            key={range.key}
            variant={currentRange?.label === range.label ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePredefinedRange(range)}
            className="text-xs"
          >
            {range.label}
          </Button>
        ))}
      </div>

      {/* Custom Date Range */}
      <div className="flex items-center gap-2 ml-4 pl-4 border-l">
        <span className="text-sm text-gray-600">Custom:</span>
        
        {/* Start Date Picker */}
        <Popover open={showStartCalendar} onOpenChange={setShowStartCalendar}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              <CalendarIcon className="w-3 h-3 mr-1" />
              {customStartDate ? format(customStartDate, 'MMM d') : 'Start'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={customStartDate}
              onSelect={(date) => {
                setCustomStartDate(date);
                setShowStartCalendar(false);
              }}
              disabled={(date) => date > new Date()}
            />
          </PopoverContent>
        </Popover>

        {/* End Date Picker */}
        <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              <CalendarIcon className="w-3 h-3 mr-1" />
              {customEndDate ? format(customEndDate, 'MMM d') : 'End'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={customEndDate}
              onSelect={(date) => {
                setCustomEndDate(date);
                setShowEndCalendar(false);
              }}
              disabled={(date) => date > new Date() || (customStartDate && date < customStartDate)}
            />
          </PopoverContent>
        </Popover>

        {/* Apply Custom Range */}
        {customStartDate && customEndDate && (
          <Button 
            size="sm" 
            onClick={handleCustomRange}
            className="text-xs momentum-btn-primary"
          >
            Apply
          </Button>
        )}

        {/* Clear Custom Dates */}
        {(customStartDate || customEndDate) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearCustomDates}
            className="text-xs p-1"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Current Range Display */}
      {currentRange && (
        <Badge variant="secondary" className="ml-2">
          {currentRange.label}
        </Badge>
      )}
    </div>
  );
}