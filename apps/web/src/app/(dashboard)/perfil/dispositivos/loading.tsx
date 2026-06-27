import { Skeleton } from "@heroui/react";

export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48 rounded-lg" />
      <Skeleton className="h-60 w-full rounded-lg" />
    </div>
  );
}
