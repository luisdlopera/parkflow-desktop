"use client";

import { DateField, DateRangePicker, Label, RangeCalendar } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import React, { useMemo } from "react";

interface DateRangeInputProps {
  fromLabel?: string;
  toLabel?: string;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  className?: string;
}

export default function DateRangeInput({
  fromLabel = "Desde",
  toLabel = "Hasta",
  from,
  to,
  onFromChange,
  onToChange,
  className = "",
}: DateRangeInputProps) {
  // Convert from/to strings ("YYYY-MM-DD") to CalendarDate objects for HeroUI
  const value = useMemo(() => {
    try {
      if (!from || !to) return null;
      return {
        start: parseDate(from),
        end: parseDate(to),
      };
    } catch {
      return null;
    }
  }, [from, to]);

  const handleChange = (newValue: any) => {
    if (newValue?.start) {
      onFromChange(newValue.start.toString());
    }
    if (newValue?.end) {
      onToChange(newValue.end.toString());
    }
  };

  return (
    <DateRangePicker 
      className={`w-full sm:w-80 ${className}`} 
      value={value as any} 
      onChange={handleChange}
    >
      <Label>{fromLabel} - {toLabel}</Label>
      <DateField.Group fullWidth>
        <DateField.Input slot="start">
          {(segment: any) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateRangePicker.RangeSeparator />
        <DateField.Input slot="end">
          {(segment: any) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateField.Suffix>
          <DateRangePicker.Trigger>
            <DateRangePicker.TriggerIndicator />
          </DateRangePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DateRangePicker.Popover>
        <RangeCalendar aria-label={`${fromLabel} - ${toLabel}`}>
          <RangeCalendar.Header>
            <RangeCalendar.YearPickerTrigger>
              <RangeCalendar.YearPickerTriggerHeading />
              <RangeCalendar.YearPickerTriggerIndicator />
            </RangeCalendar.YearPickerTrigger>
            <RangeCalendar.NavButton slot="previous" />
            <RangeCalendar.NavButton slot="next" />
          </RangeCalendar.Header>
          <RangeCalendar.Grid>
            <RangeCalendar.GridHeader>
              {(day: any) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
            </RangeCalendar.GridHeader>
            <RangeCalendar.GridBody>
              {(date: any) => <RangeCalendar.Cell date={date} />}
            </RangeCalendar.GridBody>
          </RangeCalendar.Grid>
          <RangeCalendar.YearPickerGrid>
            <RangeCalendar.YearPickerGridBody>
              {({year}: any) => <RangeCalendar.YearPickerCell year={year} />}
            </RangeCalendar.YearPickerGridBody>
          </RangeCalendar.YearPickerGrid>
        </RangeCalendar>
      </DateRangePicker.Popover>
    </DateRangePicker>
  );
}
