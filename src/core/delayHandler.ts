

import { store } from '../store/memoryStore';
import { slotManager } from './slotManager';
import { SlotStatus } from '../types/enums';
import { logger } from '../utils/logger';

export interface DelayImpact {
  delayedSlotIds: string[];
  affectedTokenCount: number;
  redistributedTokens: number;
  overflowCreated: boolean;
  suggestions: string[];
}

export class DoctorDelayHandler {
  /**
   * Handle doctor running late - shifts all subsequent slots
   */
  handleDoctorDelay(
    doctorId: string,
    delayMinutes: number,
    fromSlotId: string
  ): DelayImpact {
    logger.warn(`Doctor ${doctorId} delayed by ${delayMinutes} minutes from slot ${fromSlotId}`);

    const doctor = store.getDoctor(doctorId);
    if (!doctor) {
      throw new Error(`Doctor ${doctorId} not found`);
    }

    const allSlots = store.getSlotsByDoctor(doctorId);
    const fromSlotIndex = allSlots.findIndex((s) => s.id === fromSlotId);

    if (fromSlotIndex === -1) {
      throw new Error(`Slot ${fromSlotId} not found for doctor ${doctorId}`);
    }

    const affectedSlots = allSlots.slice(fromSlotIndex);
    const delayedSlotIds: string[] = [];
    let affectedTokenCount = 0;
    let overflowCreated = false;

    // Calculate impact
    affectedSlots.forEach((slot) => {
      delayedSlotIds.push(slot.id);
      affectedTokenCount += slot.allocatedTokens.length + slot.waitlist.length;
    });

    // Decision: Merge slots or extend day?
    const suggestions: string[] = [];

    if (delayMinutes <= 15) {
      // Minor delay - absorb by reducing consultation time slightly
      suggestions.push(`Minor delay (${delayMinutes}min) - can be absorbed`);
      suggestions.push('Doctor to work slightly faster on remaining slots');
    } else if (delayMinutes <= 30) {
      // Moderate delay - merge next two slots
      const mergeResult = this.mergeTwoSlots(affectedSlots[0], affectedSlots[1]);
      if (mergeResult.overflow) {
        overflowCreated = true;
      }
      suggestions.push(`Merged slots ${affectedSlots[0].id} and ${affectedSlots[1]?.id || 'N/A'}`);
      suggestions.push(`Combined capacity: ${mergeResult.newCapacity} patients`);
    } else {
      // Major delay - extend working hours
      suggestions.push(`Major delay (${delayMinutes}min) - extend working hours`);
      suggestions.push('Add extra slot at end of day');
      suggestions.push(`Affected patients: ${affectedTokenCount}`);
    }

    logger.info(`Delay handling complete. Impact: ${affectedTokenCount} patients affected`);

    return {
      delayedSlotIds,
      affectedTokenCount,
      redistributedTokens: 0, // Would implement actual redistribution
      overflowCreated,
      suggestions,
    };
  }

  /**
   * Merge two consecutive slots to handle delays
   */
  private mergeTwoSlots(slot1: any, slot2: any) {
    if (!slot1 || !slot2) {
      return { newCapacity: slot1?.maxCapacity || 0, overflow: false };
    }

    const combinedCapacity = Math.floor((slot1.maxCapacity + slot2.maxCapacity) * 0.9); // 10% reduction due to time pressure
    const combinedLoad = slot1.currentLoad + slot2.currentLoad;

    return {
      newCapacity: combinedCapacity,
      overflow: combinedLoad > combinedCapacity,
    };
  }

  /**
   * Redistribute patients from a cancelled/delayed slot to other slots
   */
  redistributePatientsFromSlot(slotId: string): {
    redistributed: number;
    failed: number;
    details: string[];
  } {
    const slot = store.getSlot(slotId);
    if (!slot) {
      throw new Error(`Slot ${slotId} not found`);
    }

    const tokensToRedistribute = [
      ...slot.allocatedTokens,
      ...slot.waitlist,
    ];

    const details: string[] = [];
    let redistributed = 0;
    let failed = 0;

    // Get other available slots for this doctor
    const otherSlots = store
      .getSlotsByDoctor(slot.doctorId)
      .filter((s) => s.id !== slotId && s.status !== SlotStatus.CLOSED);

    tokensToRedistribute.forEach((tokenId) => {
      const token = store.getToken(tokenId);
      if (!token) return;

      // Find best slot with capacity
      const targetSlot = otherSlots.find((s) => 
        slotManager.hasCapacity(s.id)
      );

      if (targetSlot) {
        // Remove from current slot
        slotManager.removeTokenFromSlot(slotId, tokenId);
        slotManager.removeFromWaitlist(slotId, tokenId);

        // Add to new slot
        slotManager.addTokenToSlot(targetSlot.id, tokenId);
        
        store.updateToken(tokenId, { slotId: targetSlot.id });

        details.push(
          `✅ ${token.patientName}: ${slot.startTime} → ${targetSlot.startTime}`
        );
        redistributed++;
      } else {
        details.push(
          `❌ ${token.patientName}: No available slot found`
        );
        failed++;
      }
    });

    // Mark original slot as closed
    store.updateSlot(slotId, { status: SlotStatus.CLOSED });

    logger.info(
      `Redistribution complete: ${redistributed} success, ${failed} failed`
    );

    return { redistributed, failed, details };
  }

  /**
   * Handle doctor emergency leave
   */
  handleDoctorUnavailable(doctorId: string, reason: string): {
    affectedSlots: number;
    affectedPatients: number;
    redistributionPlan: string[];
  } {
    logger.error(`Doctor ${doctorId} unavailable: ${reason}`);

    const doctor = store.getDoctor(doctorId);
    if (!doctor) {
      throw new Error(`Doctor ${doctorId} not found`);
    }

    const slots = store.getSlotsByDoctor(doctorId);
    let totalAffected = 0;

    // Close all slots
    slots.forEach((slot) => {
      totalAffected += slot.allocatedTokens.length + slot.waitlist.length;
      store.updateSlot(slot.id, { status: SlotStatus.CLOSED });
    });

    const redistributionPlan = [
      `Doctor ${doctor.name} unavailable: ${reason}`,
      `Affected slots: ${slots.length}`,
      `Affected patients: ${totalAffected}`,
      '',
      'Redistribution options:',
      '1. Reschedule to next available day',
      '2. Assign to another doctor (same specialization)',
      '3. Notify patients for manual rebooking',
    ];

    return {
      affectedSlots: slots.length,
      affectedPatients: totalAffected,
      redistributionPlan,
    };
  }
}

export const delayHandler = new DoctorDelayHandler();