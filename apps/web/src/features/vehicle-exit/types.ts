export type CustodiedItemInfo = {
  id: string;
  itemType: string;
  identifier?: string | null;
  status: string;
  observations?: string | null;
  receivedByName?: string | null;
  receivedAt?: string | null;
  returnedByName?: string | null;
  returnedAt?: string | null;
};

export type ActiveLookup = {
  sessionId: string;
  subtotal?: number | string | null;
  surcharge?: number | string | null;
  discount?: number | string | null;
  deductedMinutes?: number | null;
  total?: number | string | null;
  receipt: {
    ticketNumber: string;
    plate: string;
    vehicleType: string;
    site?: string | null;
    lane?: string | null;
    booth?: string | null;
    terminal?: string | null;
    entryAt?: string | null;
    duration: string;
    totalAmount: number | null;
    rateName: string | null;
    status: string;
    lostTicket: boolean;
    reprintCount: number;
    entryMode?: string | null;
    monthlySession?: boolean;
    agreementCode?: string | null;
    prepaidMinutes?: number | null;
    custodiedItems?: CustodiedItemInfo[];
  };
};
