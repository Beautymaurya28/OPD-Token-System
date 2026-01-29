// src/routes/system.routes.ts (NEW FILE)
import { Router } from 'express';
import { delayHandler } from '../core/delayHandler';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/system/doctor-delay
 * Handle doctor running late
 */
router.post('/doctor-delay', (req, res) => {
  try {
    const { doctorId, delayMinutes, fromSlotId } = req.body;

    if (!doctorId || !delayMinutes || !fromSlotId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: doctorId, delayMinutes, fromSlotId',
      });
      return;
    }

    const impact = delayHandler.handleDoctorDelay(
      doctorId,
      delayMinutes,
      fromSlotId
    );

    res.json({
      success: true,
      message: 'Delay handled',
      data: impact,
    });
  } catch (error) {
    logger.error('Delay handling failed', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/system/redistribute-slot
 * Redistribute patients from a cancelled/delayed slot
 */
router.post('/redistribute-slot', (req, res) => {
  try {
    const { slotId } = req.body;

    if (!slotId) {
      res.status(400).json({
        success: false,
        error: 'Missing slotId',
      });
      return;
    }

    const result = delayHandler.redistributePatientsFromSlot(slotId);

    res.json({
      success: true,
      message: 'Redistribution complete',
      data: result,
    });
  } catch (error) {
    logger.error('Redistribution failed', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/system/doctor-unavailable
 * Handle doctor emergency leave
 */
router.post('/doctor-unavailable', (req, res) => {
  try {
    const { doctorId, reason } = req.body;

    if (!doctorId || !reason) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: doctorId, reason',
      });
      return;
    }

    const result = delayHandler.handleDoctorUnavailable(doctorId, reason);

    res.json({
      success: true,
      message: 'Doctor unavailability handled',
      data: result,
    });
  } catch (error) {
    logger.error('Doctor unavailability handling failed', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;