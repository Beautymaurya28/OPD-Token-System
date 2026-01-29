import { TimeSlot, Token } from '../types/domain';
import { SlotStatus, TokenStatus } from '../types/enums';
import { store } from '../store/memoryStore';
import { compareTokenPriority } from './priorityRules';

export class SlotManager {
  /**
   * Check if a slot has available capacity
   */
  hasCapacity(slotId: string): boolean {
    const slot = store.getSlot(slotId);
    if (!slot) return false;

    return slot.currentLoad < slot.maxCapacity;
  }

  /**
   * Add a token to a slot
   */
  addTokenToSlot(slotId: string, tokenId: string): void {
    const slot = store.getSlot(slotId);
    if (!slot) {
      throw new Error(`Slot ${slotId} not found`);
    }

    slot.allocatedTokens.push(tokenId);
    slot.currentLoad = slot.allocatedTokens.length;

    // Update slot status
    this.updateSlotStatus(slotId);

    store.updateSlot(slotId, slot);
  }

  /**
   * Remove a token from a slot
   */
  removeTokenFromSlot(slotId: string, tokenId: string): void {
    const slot = store.getSlot(slotId);
    if (!slot) return;

    slot.allocatedTokens = slot.allocatedTokens.filter((id) => id !== tokenId);
    slot.currentLoad = slot.allocatedTokens.length;

    // Update slot status
    this.updateSlotStatus(slotId);

    store.updateSlot(slotId, slot);
  }

  /**
   * Add token to waitlist
   */
  addToWaitlist(slotId: string, tokenId: string): void {
    const slot = store.getSlot(slotId);
    if (!slot) {
      throw new Error(`Slot ${slotId} not found`);
    }

    // Add to waitlist
    slot.waitlist.push(tokenId);

    // Sort waitlist by priority
    this.sortWaitlist(slotId);

    store.updateSlot(slotId, slot);
  }

  /**
   * Remove token from waitlist
   */
  removeFromWaitlist(slotId: string, tokenId: string): void {
    const slot = store.getSlot(slotId);
    if (!slot) return;

    slot.waitlist = slot.waitlist.filter((id) => id !== tokenId);
    store.updateSlot(slotId, slot);
  }

  /**
   * Sort waitlist by priority and timestamp
   */
  private sortWaitlist(slotId: string): void {
    const slot = store.getSlot(slotId);
    if (!slot) return;

    const waitlistTokens = slot.waitlist
      .map((id) => store.getToken(id))
      .filter((token): token is Token => token !== undefined);

    waitlistTokens.sort((a, b) =>
      compareTokenPriority(
        a.priority,
        a.createdAt,
        b.priority,
        b.createdAt
      )
    );

    slot.waitlist = waitlistTokens.map((token) => token.id);
    store.updateSlot(slotId, slot);
  }

  /**
   * Get next token from waitlist (highest priority)
   */
  getNextFromWaitlist(slotId: string): Token | null {
    const slot = store.getSlot(slotId);
    if (!slot || slot.waitlist.length === 0) {
      return null;
    }

    const nextTokenId = slot.waitlist[0];
    return store.getToken(nextTokenId) || null;
  }

  /**
   * Promote next token from waitlist to allocated
   */
  promoteFromWaitlist(slotId: string): Token | null {
    const nextToken = this.getNextFromWaitlist(slotId);
    if (!nextToken) return null;

    // Remove from waitlist
    this.removeFromWaitlist(slotId, nextToken.id);

    // Add to allocated
    this.addTokenToSlot(slotId, nextToken.id);

    // Update token status
    store.updateToken(nextToken.id, {
      status: TokenStatus.ALLOCATED,
      slotId: slotId,
      allocatedAt: new Date(),
    });

    return store.getToken(nextToken.id) || null;
  }

  /**
   * Update slot status based on current load
   */
  private updateSlotStatus(slotId: string): void {
    const slot = store.getSlot(slotId);
    if (!slot) return;

    let newStatus: SlotStatus;

    if (slot.currentLoad === 0) {
      newStatus = SlotStatus.AVAILABLE;
    } else if (slot.currentLoad < slot.maxCapacity) {
      newStatus = SlotStatus.AVAILABLE;
    } else if (slot.currentLoad === slot.maxCapacity) {
      newStatus = SlotStatus.FULL;
    } else {
      newStatus = SlotStatus.OVERFLOW;
    }

    store.updateSlot(slotId, { status: newStatus });
  }

  /**
   * Get slot utilization percentage
   */
  getSlotUtilization(slotId: string): number {
    const slot = store.getSlot(slotId);
    if (!slot) return 0;

    return (slot.currentLoad / slot.maxCapacity) * 100;
  }

  /**
   * Find best available slot for a doctor
   */
  findBestAvailableSlot(doctorId: string): TimeSlot | null {
    const slots = store.getSlotsByDoctor(doctorId);

    // Filter available slots (not closed, not in past)
    const availableSlots = slots.filter(
      (slot) =>
        slot.status !== SlotStatus.CLOSED &&
        slot.currentLoad < slot.maxCapacity
    );

    if (availableSlots.length === 0) return null;

    // Return slot with lowest utilization
    availableSlots.sort((a, b) => a.currentLoad - b.currentLoad);
    return availableSlots[0];
  }
}

export const slotManager = new SlotManager();