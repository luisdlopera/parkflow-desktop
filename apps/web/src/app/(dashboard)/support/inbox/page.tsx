import React from "react";
import { TicketList } from "@/components/support/TicketList";
import { TicketChat } from "@/components/support/TicketChat";

export default function SupportInboxPage() {
  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden border-t">
      <div className="w-1/3 border-r h-full bg-default-50 overflow-y-auto">
        <TicketList />
      </div>
      <div className="w-2/3 h-full bg-background flex flex-col">
        <TicketChat />
      </div>
    </div>
  );
}
