import { PatientType } from '../types/enums';

/**
 * Priority scoring system
 * Higher score = Higher priority
 */
export const PRIORITY_SCORES: Record<PatientType, number> = {
  [PatientType.EMERGENCY]: 100,
  [PatientType.PAID_PRIORITY]: 80,
  [PatientType.FOLLOW_UP]: 60,
  [PatientType.ONLINE_BOOKING]: 40,
  [PatientType.WALK_IN]: 20,
};

/**
 * Get priority score for a patient type
 */
export function getPriorityScore(patientType: PatientType): number {
  return PRIORITY_SCORES[patientType];
}

/**
 * Check if patientType A can bump patientType B
 * Rules:
 * - Emergency can bump anyone
 * - Paid Priority can bump Walk-ins only
 * - Others cannot bump anyone
 */
export function canBump(
  bumperType: PatientType,
  bumpedType: PatientType
): boolean {
  // Emergency can bump anyone
  if (bumperType === PatientType.EMERGENCY) {
    return true;
  }

  // Paid Priority can only bump Walk-ins
  if (bumperType === PatientType.PAID_PRIORITY) {
    return bumpedType === PatientType.WALK_IN;
  }

  // Others cannot bump
  return false;
}

/**
 * Compare two tokens for priority sorting
 * Returns: negative if a has higher priority, positive if b has higher priority
 */
export function compareTokenPriority(
  aPriority: number,
  aTimestamp: Date,
  bPriority: number,
  bTimestamp: Date
): number {
  // First compare by priority (higher is better)
  if (aPriority !== bPriority) {
    return bPriority - aPriority; // Descending order
  }

  // If same priority, earlier timestamp wins
  return aTimestamp.getTime() - bTimestamp.getTime(); // Ascending order
}

/**
 * Check if a patient has exceeded maximum bump limit
 */
export const MAX_BUMP_COUNT = 2;

export function canBeBumped(currentBumpCount: number): boolean {
  return currentBumpCount < MAX_BUMP_COUNT;
}