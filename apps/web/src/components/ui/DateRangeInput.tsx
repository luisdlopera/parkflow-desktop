"use client";

import { Input } from "@heroui/react";
import React from "react";

interface DateRangeInputProps {
  fromLabel?: string;
  toLabel?: string;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function DateRangeInput({
  fromLabel = "Desde",
  toLabel = "Hasta",
  from,
  to,
  onFromChange,
  onToChange,
  size = "sm",
  className = "",
}: DateRangeInputProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Input
        type="date"
        size={size}
        label={fromLabel}
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        className="w-[150px]"
        classNames={{
          input: "text-sm",
        }}
      />
      <span className="text-slate-400">—</span>
      <Input
        type="date"
        size={size}
        label={toLabel}
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        className="w-[150px]"
        classNames={{
          input: "text-sm",
        }}
      />
    </div>
  );
}
