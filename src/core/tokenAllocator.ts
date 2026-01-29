import { v4 as uuidv4 } from 'uuid';
import { Token, AllocationResult } from '../types/domain';
import { PatientType, TokenStatus } from '../types/enums';
import { store } from '../store/memoryStore';
import { slotManager } from './slotManager';
import {
  getPriorityScore,
  canBump,
  canBeBumped,
} from './priorityRules';
import { logger } from '../utils/logger';

export class TokenAllocator {
  /**
   * Main allocation method - decides where a token goes
   */
  allocateToken(
    patientName: string,
    patientType: PatientType,
    doctorId: string,
    preferredSlotId?: string
  ): AllocationResult {
    // Create token
    const token: Token = {
      id: uuidv4(),
      patientName,
      patientType,
      priority: getPriorityScore(patientType),
      doctorId,
      status: TokenStatus.PENDING,
      createdAt: new Date(),
      bumpCount: 0,
    };

    store.addToken(token);

    logger.info(`Token created: ${token.id} for ${patientName} (${patientType})`);

    // Determine target slot
    const targetSlot = preferredSlotId
      ? store.getSlot(preferredSlotId)
      : slotManager.findBestAvailableSlot(doctorId);

    if (!targetSlot) {
      // No slots available at all
      token.status = TokenStatus.WAITLISTED;
      store.updateToken(token.id, token);

      return {
        success: false,
        token,
        message: 'No available slots. Added to general waitlist.',
      };
    }

    // ALLOCATION LOGIC STARTS HERE
    return this.allocateToSlot(token, targetSlot.id);
  }

  /**
   * Core allocation logic for a specific slot
   */
  private allocateToSlot(token: Token, slotId: string): AllocationResult {
    const slot = store.getSlot(slotId);
    if (!slot) {
      return {
        success: false,
        token,
        message: 'Slot not found',
      };
    }

    // CASE 1: Slot has capacity - allocate directly
    if (slotManager.hasCapacity(slotId)) {
      slotManager.addTokenToSlot(slotId, token.id);

      store.updateToken(token.id, {
        status: TokenStatus.ALLOCATED,
        slotId: slotId,
        allocatedAt: new Date(),
      });

      logger.info(`Token ${token.id} allocated to slot ${slotId}`);

      return {
        success: true,
        token: store.getToken(token.id)!,
        message: 'Token allocated successfully',
        slotInfo: {
          slotId,
          currentLoad: slot.currentLoad + 1,
          maxCapacity: slot.maxCapacity,
        },
      };
    }

    // CASE 2: Slot is full - check if we can bump or if it's emergency
    if (token.patientType === PatientType.EMERGENCY) {
      // Emergency always gets in (creates overflow)
      return this.handleEmergencyAllocation(token, slotId);
    }

    // CASE 3: Try to bump a lower priority patient
    if (token.patientType === PatientType.PAID_PRIORITY) {
      const bumpResult = this.tryBumpLowerPriority(token, slotId);
      if (bumpResult.success) {
        return bumpResult;
      }
    }

    // CASE 4: Add to waitlist
    return this.addToWaitlist(token, slotId);
  }

  /**
   * Handle emergency patient allocation (can overflow)
   */
  private handleEmergencyAllocation(
    token: Token,
    slotId: string
  ): AllocationResult {
    slotManager.addTokenToSlot(slotId, token.id);

    store.updateToken(token.id, {
      status: TokenStatus.ALLOCATED,
      slotId: slotId,
      allocatedAt: new Date(),
    });

    const slot = store.getSlot(slotId)!;

    logger.warn(
      `Emergency token ${token.id} created overflow in slot ${slotId} (${slot.currentLoad}/${slot.maxCapacity})`
    );

    return {
      success: true,
      token: store.getToken(token.id)!,
      message: `Emergency patient allocated (slot in overflow: ${slot.currentLoad}/${slot.maxCapacity})`,
      slotInfo: {
        slotId,
        currentLoad: slot.currentLoad,
        maxCapacity: slot.maxCapacity,
      },
    };
  }

  /**
   * Try to bump a lower priority patient from the slot
   */
  private tryBumpLowerPriority(
    token: Token,
    slotId: string
  ): AllocationResult {
    const slot = store.getSlot(slotId);
    if (!slot) {
      return {
        success: false,
        token,
        message: 'Slot not found',
      };
    }

    // Get all allocated tokens in this slot
    const allocatedTokens = slot.allocatedTokens
      .map((id) => store.getToken(id))
      .filter((t): t is Token => t !== undefined);

    // Find bumpable candidates (Walk-ins that haven't been bumped too much)
    const bumpableCandidates = allocatedTokens.filter(
      (t) =>
        canBump(token.patientType, t.patientType) && canBeBumped(t.bumpCount)
    );

    if (bumpableCandidates.length === 0) {
      return {
        success: false,
        token,
        message: 'No bumpable patients found',
      };
    }

    // Bump the most recently added walk-in (LIFO for fairness)
    const tokenToBump = bumpableCandidates[bumpableCandidates.length - 1];

    // Remove bumped token from slot
    slotManager.removeTokenFromSlot(slotId, tokenToBump.id);

    // Update bumped token
    store.updateToken(tokenToBump.id, {
      status: TokenStatus.WAITLISTED,
      slotId: undefined,
      allocatedAt: undefined,
      bumpCount: tokenToBump.bumpCount + 1,
    });

    // Add bumped token to waitlist
    slotManager.addToWaitlist(slotId, tokenToBump.id);

    // Allocate new token
    slotManager.addTokenToSlot(slotId, token.id);
    store.updateToken(token.id, {
      status: TokenStatus.ALLOCATED,
      slotId: slotId,
      allocatedAt: new Date(),
    });

    logger.info(
      `Token ${token.id} bumped token ${tokenToBump.id} (bump count: ${tokenToBump.bumpCount})`
    );

    return {
      success: true,
      token: store.getToken(token.id)!,
      message: `Allocated by bumping patient ${tokenToBump.patientName}`,
      slotInfo: {
        slotId,
        currentLoad: slot.currentLoad,
        maxCapacity: slot.maxCapacity,
      },
    };
  }

  /**
   * Add token to waitlist
   */
  private addToWaitlist(token: Token, slotId: string): AllocationResult {
    slotManager.addToWaitlist(slotId, token.id);

    store.updateToken(token.id, {
      status: TokenStatus.WAITLISTED,
      slotId: slotId, // Track which slot they're waiting for
    });

    const slot = store.getSlot(slotId)!;

    logger.info(`Token ${token.id} added to waitlist for slot ${slotId}`);

    return {
      success: false,
      token: store.getToken(token.id)!,
      message: `Added to waitlist (position: ${slot.waitlist.length})`,
      slotInfo: {
        slotId,
        currentLoad: slot.currentLoad,
        maxCapacity: slot.maxCapacity,
      },
    };
  }

  /**
   * Handle token cancellation
   */
  cancelToken(tokenId: string): AllocationResult {
    const token = store.getToken(tokenId);

    if (!token) {
      throw new Error(`Token ${tokenId} not found`);
    }

    if (token.status === TokenStatus.CANCELLED) {
      return {
        success: false,
        token,
        message: 'Token already cancelled',
      };
    }

    const slotId = token.slotId;

    // Update token status
    store.updateToken(tokenId, {
      status: TokenStatus.CANCELLED,
    });

    logger.info(`Token ${tokenId} cancelled`);

    // If token was allocated, free the slot and promote from waitlist
    if (slotId && token.status === TokenStatus.ALLOCATED) {
      slotManager.removeTokenFromSlot(slotId, tokenId);

      // Try to promote from waitlist
      const promoted = slotManager.promoteFromWaitlist(slotId);

      if (promoted) {
        logger.info(
          `Token ${promoted.id} promoted from waitlist after cancellation`
        );
      }
    }

    // If token was in waitlist, just remove it
    if (slotId && token.status === TokenStatus.WAITLISTED) {
      slotManager.removeFromWaitlist(slotId, tokenId);
    }

    return {
      success: true,
      token: store.getToken(tokenId)!,
      message: 'Token cancelled successfully',
    };
  }

  /**
   * Handle no-show
   */
  markNoShow(tokenId: string): AllocationResult {
    const token = store.getToken(tokenId);

    if (!token) {
      throw new Error(`Token ${tokenId} not found`);
    }

    const slotId = token.slotId;

    // Update token status
    store.updateToken(tokenId, {
      status: TokenStatus.NO_SHOW,
    });

    logger.warn(`Token ${tokenId} marked as NO_SHOW`);

    // Free the slot and promote from waitlist
    if (slotId) {
      slotManager.removeTokenFromSlot(slotId, tokenId);

      const promoted = slotManager.promoteFromWaitlist(slotId);

      if (promoted) {
        logger.info(
          `Token ${promoted.id} promoted from waitlist after no-show`
        );
      }
    }

    return {
      success: true,
      token: store.getToken(tokenId)!,
      message: 'Marked as no-show, slot freed',
    };
  }

  /**
   * Mark token as completed
   */
  completeToken(tokenId: string): void {
    const token = store.getToken(tokenId);
    if (!token) {
      throw new Error(`Token ${tokenId} not found`);
    }

    store.updateToken(tokenId, {
      status: TokenStatus.COMPLETED,
    });

    logger.info(`Token ${tokenId} completed`);
  }
}

export const tokenAllocator = new TokenAllocator();