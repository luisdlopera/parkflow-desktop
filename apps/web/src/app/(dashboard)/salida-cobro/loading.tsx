import { Skeleton } from "@heroui/react";

export default function Loading() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Skeleton className="h-8 w-64 rounded-lg" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-[500px] w-full rounded-xl" />
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    </div>
  );
}
