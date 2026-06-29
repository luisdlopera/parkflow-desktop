import React from "react";
import { Button, Input, Avatar } from "@heroui/react";

export function TicketChat() {
  return (
    <>
      <div className="flex items-center gap-4 p-4 border-b">
        <Avatar>
          <Avatar.Fallback>JD</Avatar.Fallback>
        </Avatar>
        <div>
          <h3 className="font-bold">John Doe</h3>
          <p className="text-tiny text-default-500">TK-1A2B • Cannot access parking</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="flex gap-2 self-start max-w-[80%]">
          <Avatar size="sm">
            <Avatar.Fallback>J</Avatar.Fallback>
          </Avatar>
          <div className="bg-default-100 rounded-lg p-3">
            <p className="text-sm">Hi, I am stuck at the north gate. The scanner is not reading my QR code.</p>
            <span className="text-tiny text-default-400 mt-1">10:42 AM</span>
          </div>
        </div>
        
        <div className="flex gap-2 self-end max-w-[80%] flex-row-reverse">
          <Avatar size="sm" color="accent">
            <Avatar.Fallback>S</Avatar.Fallback>
          </Avatar>
          <div className="bg-brand text-brand-foreground rounded-lg p-3">
            <p className="text-sm">Hello John, I am opening the gate for you remotely right now.</p>
            <span className="text-tiny text-brand-300 dark:text-brand-400 mt-1">10:45 AM</span>
          </div>
        </div>
      </div>

      <div className="p-4 border-t bg-default-50 flex gap-2">
        <Input 
          placeholder="Type your message..." 
          fullWidth 
        />
        <Button variant="primary">Send</Button>
      </div>
    </>
  );
}
