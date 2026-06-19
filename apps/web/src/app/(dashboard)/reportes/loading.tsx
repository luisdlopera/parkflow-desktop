import { Card } from "@/components/bridge/Card";
import { Skeleton } from "@heroui/react";

export default function ReportesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Skeleton className="h-8 w-64 rounded-lg mb-2" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-24 rounded-lg mb-4" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <Skeleton className="h-6 w-48 rounded-lg mb-6" />
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </Card>
    </div>
  );
}
