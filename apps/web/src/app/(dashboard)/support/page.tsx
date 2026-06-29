import React from "react";
import { Card, Button } from "@heroui/react";
import Link from "next/link";

export default function SupportDashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Support Dashboard</h1>
        <Link href="/support/inbox">
          <Button variant="primary">
            Go to Inbox
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <Card.Header className="pb-0 pt-4 px-4 flex-col items-start">
            <h4 className="font-bold text-large">Open Tickets</h4>
          </Card.Header>
          <Card.Content className="py-2">
            <p className="text-4xl font-bold text-brand">24</p>
          </Card.Content>
        </Card>
        
        <Card>
          <Card.Header className="pb-0 pt-4 px-4 flex-col items-start">
            <h4 className="font-bold text-large">Avg Response Time</h4>
          </Card.Header>
          <Card.Content className="py-2">
            <p className="text-4xl font-bold text-success">15m</p>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header className="pb-0 pt-4 px-4 flex-col items-start">
            <h4 className="font-bold text-large">SLA Breaches</h4>
          </Card.Header>
          <Card.Content className="py-2">
            <p className="text-4xl font-bold text-danger">2</p>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header className="pb-0 pt-4 px-4 flex-col items-start">
            <h4 className="font-bold text-large">Tickets Closed Today</h4>
          </Card.Header>
          <Card.Content className="py-2">
            <p className="text-4xl font-bold">8</p>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
