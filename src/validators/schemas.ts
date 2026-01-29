import { z } from 'zod';
import { PatientType } from '../types/enums';

/**
 * Validation schemas using Zod
 */

export const createTokenSchema = z.object({
  patientName: z.string().min(2, 'Patient name must be at least 2 characters'),
  patientType: z.nativeEnum(PatientType),
  doctorId: z.string().min(1, 'Doctor ID is required'),
  preferredSlotId: z.string().optional(),
});

export const cancelTokenSchema = z.object({
  reason: z.string().optional(),
});

export const emergencyTokenSchema = z.object({
  patientName: z.string().min(2, 'Patient name must be at least 2 characters'),
  doctorId: z.string().min(1, 'Doctor ID is required'),
  severity: z.enum(['critical', 'high', 'medium']),
});

export const tokenIdParamSchema = z.object({
  tokenId: z.string().uuid('Invalid token ID format'),
});

export const slotIdParamSchema = z.object({
  slotId: z.string().min(1, 'Slot ID is required'),
});

export const doctorIdParamSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
});

// Type inference from schemas
export type CreateTokenInput = z.infer<typeof createTokenSchema>;
export type CancelTokenInput = z.infer<typeof cancelTokenSchema>;
export type EmergencyTokenInput = z.infer<typeof emergencyTokenSchema>;