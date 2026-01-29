/**
 * Time utility functions for slot management
 */

/**
 * Parse time string to minutes since midnight
 * Example: "09:30" -> 570
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string
 * Example: 570 -> "09:30"
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Check if a time slot is in the past
 */
export function isSlotInPast(slotTime: string): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const slotMinutes = timeToMinutes(slotTime);
  
  return slotMinutes < currentMinutes;
}

/**
 * Generate time slots for a day
 * Example: generateTimeSlots("09:00", "17:00", 60) 
 * Returns: ["09:00-10:00", "10:00-11:00", ...]
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  slotDurationMinutes: number
): Array<{ start: string; end: string }> {
  const slots: Array<{ start: string; end: string }> = [];
  
  let currentMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  while (currentMinutes < endMinutes) {
    const start = minutesToTime(currentMinutes);
    const end = minutesToTime(currentMinutes + slotDurationMinutes);
    
    slots.push({ start, end });
    currentMinutes += slotDurationMinutes;
  }
  
  return slots;
}

/**
 * Format time slot for display
 */
export function formatSlotTime(start: string, end: string): string {
  return `${start} - ${end}`;
}

/**
 * Get current time as HH:MM string
 */
export function getCurrentTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}