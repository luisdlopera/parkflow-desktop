/**
 * Parking domain types (vehicles, spaces, sessions).
 */

export type Vehicle = {
  id: string;
  plate: string;
  type: VehicleType;
  color?: string;
  enteredAt: string;
};

export type VehicleType = "CAR" | "MOTORCYCLE" | "TRUCK" | "BUS" | "OTHER";

export type ParkingSession = {
  id: string;
  ticketNumber: string;
  vehicle: Vehicle;
  entryAt: string;
  exitAt?: string;
  parkingSpaceId?: string;
  rateId: string;
  rateName: string;
  totalAmount?: number;
  status: "active" | "exited" | "voided";
};

export type ParkingSpace = {
  id: string;
  code: string;
  siteId: string;
  floor?: number;
  zone?: string;
  isOccupied: boolean;
  capacity: number;
};
