import { PatientType } from './enums';

export interface CreateTokenRequest {
  patientName: string;
  patientType: PatientType;
  doctorId: string;
  preferredSlotId?: string;
}

export interface CreateTokenResponse {
  success: boolean;
  tokenId?: string;
  message: string;
  queuePosition?: number;
}

export interface CancelTokenRequest {
  tokenId: string;
  reason?: string;
}

export interface EmergencyTokenRequest {
  patientName: string;
  doctorId: string;
  severity: 'critical' | 'high' | 'medium';
}