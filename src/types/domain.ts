import { PatientType, TokenStatus, SlotStatus } from './enums';

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  availableSlots: string[]; // slot IDs
}

export interface TimeSlot {
  id: string;
  doctorId: string;
  startTime: string; // ISO format or "09:00"
  endTime: string;   // ISO format or "10:00"
  maxCapacity: number;
  currentLoad: number;
  status: SlotStatus;
  allocatedTokens: string[]; // token IDs
  waitlist: string[]; // token IDs
}

export interface Token {
  id: string;
  patientName: string;
  patientType: PatientType;
  priority: number;
  doctorId: string;
  slotId?: string;
  status: TokenStatus;
  createdAt: Date;
  allocatedAt?: Date;
  bumpCount: number; // Track how many times bumped (max 2)
}

export interface AllocationResult {
  success: boolean;
  token: Token;
  message: string;
  slotInfo?: {
    slotId: string;
    currentLoad: number;
    maxCapacity: number;
  };
}