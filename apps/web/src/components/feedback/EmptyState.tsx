"use client";

import React from "react";
import { Button } from "@heroui/button";
import { Search } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon = <Search size={48} />,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="mb-6 text-default-300">
        {icon}
      </div>
      
      <h3 className="mb-2 text-xl font-semibold text-foreground">
        {title}
      </h3>
      
      <p className="mb-8 max-w-sm text-default-500">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button
          color="primary"
          variant="flat"
          onClick={onAction}
          className="font-medium"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
