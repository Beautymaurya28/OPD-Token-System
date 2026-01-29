import { Doctor, TimeSlot } from '../types/domain';
import { SlotStatus } from '../types/enums';
import { store } from './memoryStore';
import { generateTimeSlots } from '../utils/timeHelpers';
import { logger } from '../utils/logger';

/**
 * Initialize system with sample doctors
 */
export function initializeDoctors(): Doctor[] {
  const doctors: Doctor[] = [
    {
      id: 'doc-1',
      name: 'Dr. Rajesh Kumar',
      specialization: 'Cardiology',
      availableSlots: [],
    },
    {
      id: 'doc-2',
      name: 'Dr. Priya Sharma',
      specialization: 'Pediatrics',
      availableSlots: [],
    },
    {
      id: 'doc-3',
      name: 'Dr. Amit Patel',
      specialization: 'Orthopedics',
      availableSlots: [],
    },
  ];

  doctors.forEach((doctor) => {
    store.addDoctor(doctor);
  });

  logger.info(`✅ Initialized ${doctors.length} doctors`);
  return doctors;
}

/**
 * Create slots for a specific doctor
 */
export function createSlotsForDoctor(
  doctorId: string,
  startTime: string,
  endTime: string,
  slotDurationMinutes: number = 60,
  maxCapacity: number = 10
): TimeSlot[] {
  const doctor = store.getDoctor(doctorId);
  if (!doctor) {
    throw new Error(`Doctor ${doctorId} not found`);
  }

  const timeSlots = generateTimeSlots(startTime, endTime, slotDurationMinutes);
  const slots: TimeSlot[] = [];

  timeSlots.forEach((timeSlot) => {
    const slotId = `slot-${doctorId}-${timeSlot.start.replace(':', '')}`;
    
    const slot: TimeSlot = {
      id: slotId,
      doctorId: doctorId,
      startTime: timeSlot.start,
      endTime: timeSlot.end,
      maxCapacity: maxCapacity,
      currentLoad: 0,
      status: SlotStatus.AVAILABLE,
      allocatedTokens: [],
      waitlist: [],
    };

    store.addSlot(slot);
    doctor.availableSlots.push(slotId);
    slots.push(slot);
  });

  store.addDoctor(doctor); // Update doctor with slot IDs

  logger.info(
    `✅ Created ${slots.length} slots for ${doctor.name} (${startTime}-${endTime})`
  );

  return slots;
}

/**
 * Initialize all slots for all doctors
 */
export function initializeAllSlots(): void {
  const doctors = store.getAllDoctors();

  doctors.forEach((doctor) => {
    // Different schedules for different doctors
    switch (doctor.id) {
      case 'doc-1': // Dr. Rajesh Kumar (Cardiology)
        createSlotsForDoctor(doctor.id, '09:00', '17:00', 60, 10);
        break;
      
      case 'doc-2': // Dr. Priya Sharma (Pediatrics)
        createSlotsForDoctor(doctor.id, '10:00', '18:00', 60, 12);
        break;
      
      case 'doc-3': // Dr. Amit Patel (Orthopedics)
        createSlotsForDoctor(doctor.id, '08:00', '16:00', 60, 8);
        break;
      
      default:
        createSlotsForDoctor(doctor.id, '09:00', '17:00', 60, 10);
    }
  });

  logger.info(`✅ All slots initialized`);
}

/**
 * Reset entire system
 */
export function resetSystem(): void {
  store.clear();
  logger.info('🔄 System reset complete');
}

/**
 * Initialize complete system (doctors + slots)
 */
export function initializeSystem(): void {
  logger.info('🚀 Initializing OPD Token System...');
  
  resetSystem();
  initializeDoctors();
  initializeAllSlots();
  
  const stats = store.getStats();
  logger.info('✅ System initialization complete');
  logger.info(`📊 Stats: ${JSON.stringify(stats, null, 2)}`);
}

/**
 * Get system overview
 */
export function getSystemOverview() {
  const doctors = store.getAllDoctors();
  const slots = store.getAllSlots();
  const tokens = store.getAllTokens();

  const overview = {
    totalDoctors: doctors.length,
    totalSlots: slots.length,
    totalTokens: tokens.length,
    doctors: doctors.map((doc) => ({
      id: doc.id,
      name: doc.name,
      specialization: doc.specialization,
      totalSlots: doc.availableSlots.length,
      slotsUtilization: doc.availableSlots.map((slotId) => {
        const slot = store.getSlot(slotId);
        return slot
          ? {
              slotId,
              time: `${slot.startTime}-${slot.endTime}`,
              load: `${slot.currentLoad}/${slot.maxCapacity}`,
              status: slot.status,
              waitlist: slot.waitlist.length,
            }
          : null;
      }).filter(Boolean),
    })),
    tokensByStatus: {
      pending: tokens.filter((t) => t.status === 'PENDING').length,
      allocated: tokens.filter((t) => t.status === 'ALLOCATED').length,
      waitlisted: tokens.filter((t) => t.status === 'WAITLISTED').length,
      completed: tokens.filter((t) => t.status === 'COMPLETED').length,
      cancelled: tokens.filter((t) => t.status === 'CANCELLED').length,
      noShow: tokens.filter((t) => t.status === 'NO_SHOW').length,
    },
  };

  return overview;
}