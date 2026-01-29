import { Router, Request, Response } from 'express';
import { store } from '../store/memoryStore';
import { slotIdParamSchema } from '../validators/schemas';

const router = Router();

/**
 * GET /api/slots
 * Get all slots
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const slots = store.getAllSlots();
    
    const slotsWithInfo = slots.map((slot) => {
      const doctor = store.getDoctor(slot.doctorId);
      return {
        ...slot,
        doctorName: doctor?.name || 'Unknown',
        utilization: `${slot.currentLoad}/${slot.maxCapacity}`,
        utilizationPercentage: (slot.currentLoad / slot.maxCapacity) * 100,
        waitlistCount: slot.waitlist.length,
      };
    });
    
    res.json({
      success: true,
      data: slotsWithInfo,
      count: slots.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/slots/:slotId
 * Get specific slot details
 */
router.get('/:slotId', (req: Request, res: Response) => {
  try {
    const { slotId } = slotIdParamSchema.parse(req.params);
    
    const slot = store.getSlot(slotId);
    
    if (!slot) {
      res.status(404).json({
        success: false,
        error: 'Slot not found',
      });
      return;
    }
    
    const doctor = store.getDoctor(slot.doctorId);
    const allocatedTokens = slot.allocatedTokens.map((tokenId) => 
      store.getToken(tokenId)
    ).filter(Boolean);
    
    const waitlistTokens = slot.waitlist.map((tokenId) => 
      store.getToken(tokenId)
    ).filter(Boolean);
    
    res.json({
      success: true,
      data: {
        slot: {
          ...slot,
          doctorName: doctor?.name || 'Unknown',
          utilization: `${slot.currentLoad}/${slot.maxCapacity}`,
          utilizationPercentage: (slot.currentLoad / slot.maxCapacity) * 100,
        },
        allocatedTokens,
        waitlistTokens,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Validation error',
    });
  }
});

/**
 * GET /api/slots/:slotId/availability
 * Check slot availability
 */
router.get('/:slotId/availability', (req: Request, res: Response) => {
  try {
    const { slotId } = slotIdParamSchema.parse(req.params);
    
    const slot = store.getSlot(slotId);
    
    if (!slot) {
      res.status(404).json({
        success: false,
        error: 'Slot not found',
      });
      return;
    }
    
    const available = slot.currentLoad < slot.maxCapacity;
    const spotsLeft = slot.maxCapacity - slot.currentLoad;
    
    res.json({
      success: true,
      data: {
        slotId: slot.id,
        time: `${slot.startTime} - ${slot.endTime}`,
        available,
        spotsLeft,
        currentLoad: slot.currentLoad,
        maxCapacity: slot.maxCapacity,
        status: slot.status,
        waitlistCount: slot.waitlist.length,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Validation error',
    });
  }
});

export default router;