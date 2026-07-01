"use client";
import React from "react";
import { Card, Avatar, Chip, Spinner } from "@heroui/react";
import useSWR from "swr";
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";

const fetcher = (url: string) => fetchWithCredentials(url).then(res => res.json());

export function TicketList() {
  const { data: tickets, error, isLoading } = useSWR(
    `/api/v1/support/tickets`, 
    fetcher,
    { fallbackData: [] }
  );

  if (isLoading) return <div className="p-4 flex justify-center"><Spinner /></div>;
  if (error) return <div className="p-4 text-danger">Failed to load tickets</div>;

  return (
    <div className="flex flex-col gap-2 p-4">
      <h2 className="text-xl font-bold mb-4">Open Conversations</h2>
      {tickets.length === 0 && <p className="text-default-500">No open tickets found.</p>}
      
      {tickets.map((ticket: any) => (
        <Card key={ticket.id} className="w-full cursor-pointer hover:bg-default-100 transition-colors">
          <Card.Content className="flex flex-row items-center gap-4">
            <Avatar>
              <Avatar.Fallback>{(ticket.customerName || "Customer").charAt(0).toUpperCase()}</Avatar.Fallback>
            </Avatar>
            <div className="flex flex-col flex-1 items-start">
              <span className="font-bold text-small">{ticket.customerName || "Customer"}</span>
              <span className="text-default-500 text-tiny">{ticket.title}</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-tiny text-default-400">{ticket.ticketNumber}</span>
              <Chip size="sm" color={ticket.priority === "CRITICAL" ? "danger" : "default"}>
                {ticket.status}
              </Chip>
            </div>
          </Card.Content>
        </Card>
      ))}
    </div>
  );
}
