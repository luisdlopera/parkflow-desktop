import dynamic from "next/dynamic";
import { Card } from "@/components/bridge/Card";

const UsersPageClient = dynamic(
  () => import("./UsersPageClient").then((mod) => mod.AdminUsersPageClient),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 bg-default-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-default-200 rounded w-64"></div>
          </div>
          <div className="h-10 bg-default-200 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 h-24 bg-default-100">{null}</Card>
          <Card className="p-4 h-24 bg-default-100">{null}</Card>
        </div>
        <div className="h-64 bg-default-100 rounded-xl"></div>
      </div>
    ),
  }
);

export default function AdminUsersPage() {
  return <UsersPageClient />;
}
