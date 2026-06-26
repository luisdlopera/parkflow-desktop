"use client";

import type { DateValue } from "@internationalized/date";
import { Calendar, DateField, DatePicker, Label } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { useMemo } from "react";

interface ReportDateFilterProps {
  dateFrom: string;
  dateTo: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  label?: string;
}

function SingleDatePicker({
  label,
  value,
  onChange,
  name,
}: {
  label: string;
  value: DateValue | null;
  onChange: (v: DateValue | null) => void;
  name: string;
}) {
  return (
    <DatePicker
      name={name}
      value={value as DateValue | undefined}
      onChange={onChange as ((v: DateValue | null) => void) & ((v: DateValue) => void)}
      className="w-40"
    >
      <Label className="text-xs font-medium text-slate-500 mb-1">{label}</Label>
      <DateField.Group fullWidth>
        <DateField.Input className="text-sm">
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover>
        <Calendar aria-label={label}>
          <Calendar.Header>
            <Calendar.YearPickerTrigger>
              <Calendar.YearPickerTriggerHeading />
              <Calendar.YearPickerTriggerIndicator />
            </Calendar.YearPickerTrigger>
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>
              {(date) => <Calendar.Cell date={date} />}
            </Calendar.GridBody>
          </Calendar.Grid>
          <Calendar.YearPickerGrid>
            <Calendar.YearPickerGridBody>
              {({ year }) => <Calendar.YearPickerCell year={year} />}
            </Calendar.YearPickerGridBody>
          </Calendar.YearPickerGrid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  );
}

export default function ReportDateFilter({
  dateFrom,
  dateTo,
  onFromChange,
  onToChange,
  label = "Período",
}: ReportDateFilterProps) {
  const fromValue = useMemo<DateValue | null>(() => {
    try { return dateFrom ? parseDate(dateFrom) : null; } catch { return null; }
  }, [dateFrom]);

  const toValue = useMemo<DateValue | null>(() => {
    try { return dateTo ? parseDate(dateTo) : null; } catch { return null; }
  }, [dateTo]);

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide pb-1">{label}</span>
      <SingleDatePicker
        name="dateFrom"
        label="Desde"
        value={fromValue}
        onChange={(v) => v && onFromChange(v.toString())}
      />
      <span className="text-slate-300 pb-2">→</span>
      <SingleDatePicker
        name="dateTo"
        label="Hasta"
        value={toValue}
        onChange={(v) => v && onToChange(v.toString())}
      />
    </div>
  );
}
