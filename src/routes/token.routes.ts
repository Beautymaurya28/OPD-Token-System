import { Router, Request, Response } from 'express';
import { tokenAllocator } from '../core/tokenAllocator';
import { store } from '../store/memoryStore';
import { PatientType, TokenStatus } from '../types/enums';
import {
  createTokenSchema,
  cancelTokenSchema,
  emergencyTokenSchema,
  tokenIdParamSchema,
} from '../validators/schemas';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/tokens
 * Create a new token (book an appointment)
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const input = createTokenSchema.parse(req.body);
    
    logger.info(`Token request: ${input.patientName} (${input.patientType})`);
    
    const result = tokenAllocator.allocateToken(
      input.patientName,
      input.patientType,
      input.doctorId,
      input.preferredSlotId
    );
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          token: result.token,
          slot: result.slotInfo,
        },
      });
    } else {
      res.status(200).json({
        success: false,
        message: result.message,
        data: {
          token: result.token,
          slot: result.slotInfo,
        },
      });
    }
  } catch (error) {
    logger.error('Token creation failed', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Validation error',
    });
  }
});

/**
 * POST /api/tokens/emergency
 * Create emergency token (always gets allocated)
 */
router.post('/emergency', (req: Request, res: Response) => {
  try {
    const input = emergencyTokenSchema.parse(req.body);
    
    logger.warn(`Emergency token request: ${input.patientName}`);
    
    const result = tokenAllocator.allocateToken(
      input.patientName,
      PatientType.EMERGENCY,
      input.doctorId
    );
    
    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        token: result.token,
        slot: result.slotInfo,
        severity: input.severity,
      },
    });
  } catch (error) {
    logger.error('Emergency token creation failed', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Validation error',
    });
  }
});

/**
 * GET /api/tokens
 * Get all tokens
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, doctorId } = req.query;
    
    let tokens = store.getAllTokens();
    
    // Filter by status if provided
    if (status && typeof status === 'string') {
      tokens = tokens.filter((t) => t.status === status);
    }
    
    // Filter by doctor if provided
    if (doctorId && typeof doctorId === 'string') {
      tokens = tokens.filter((t) => t.doctorId === doctorId);
    }
    
    res.json({
      success: true,
      data: tokens,
      count: tokens.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/tokens/:tokenId
 * Get specific token details
 */
router.get('/:tokenId', (req: Request, res: Response) => {
  try {
    const { tokenId } = tokenIdParamSchema.parse(req.params);
    
    const token = store.getToken(tokenId);
    
    if (!token) {
      res.status(404).json({
        success: false,
        error: 'Token not found',
      });
      return;
    }
    
    const doctor = store.getDoctor(token.doctorId);
    const slot = token.slotId ? store.getSlot(token.slotId) : null;
    
    res.json({
      success: true,
      data: {
        token,
        doctor: doctor ? {
          id: doctor.id,
          name: doctor.name,
          specialization: doctor.specialization,
        } : null,
        slot: slot ? {
          id: slot.id,
          time: `${slot.startTime} - ${slot.endTime}`,
          status: slot.status,
        } : null,
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
 * DELETE /api/tokens/:tokenId
 * Cancel a token
 */
router.delete('/:tokenId', (req: Request, res: Response) => {
  try {
    const { tokenId } = tokenIdParamSchema.parse(req.params);
    const { reason } = cancelTokenSchema.parse(req.body);
    
    logger.info(`Cancelling token: ${tokenId}${reason ? ` (Reason: ${reason})` : ''}`);
    
    const result = tokenAllocator.cancelToken(tokenId);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        token: result.token,
        reason,
      },
    });
  } catch (error) {
    logger.error('Token cancellation failed', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error cancelling token',
    });
  }
});

/**
 * POST /api/tokens/:tokenId/no-show
 * Mark token as no-show
 */
router.post('/:tokenId/no-show', (req: Request, res: Response) => {
  try {
    const { tokenId } = tokenIdParamSchema.parse(req.params);
    
    logger.warn(`Marking no-show: ${tokenId}`);
    
    const result = tokenAllocator.markNoShow(tokenId);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        token: result.token,
      },
    });
  } catch (error) {
    logger.error('No-show marking failed', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error marking no-show',
    });
  }
});

/**
 * POST /api/tokens/:tokenId/complete
 * Mark token as completed
 */
router.post('/:tokenId/complete', (req: Request, res: Response) => {
  try {
    const { tokenId } = tokenIdParamSchema.parse(req.params);
    
    logger.info(`Completing token: ${tokenId}`);
    
    tokenAllocator.completeToken(tokenId);
    
    const token = store.getToken(tokenId);
    
    res.json({
      success: true,
      message: 'Token marked as completed',
      data: {
        token,
      },
    });
  } catch (error) {
    logger.error('Token completion failed', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error completing token',
    });
  }
});

/**
 * GET /api/tokens/stats/summary
 * Get token statistics
 */
router.get('/stats/summary', (_req: Request, res: Response) => {
  try {
    const tokens = store.getAllTokens();
    
    const stats = {
      total: tokens.length,
      byStatus: {
        pending: tokens.filter((t) => t.status === TokenStatus.PENDING).length,
        allocated: tokens.filter((t) => t.status === TokenStatus.ALLOCATED).length,
        waitlisted: tokens.filter((t) => t.status === TokenStatus.WAITLISTED).length,
        completed: tokens.filter((t) => t.status === TokenStatus.COMPLETED).length,
        cancelled: tokens.filter((t) => t.status === TokenStatus.CANCELLED).length,
        noShow: tokens.filter((t) => t.status === TokenStatus.NO_SHOW).length,
      },
      byType: {
        emergency: tokens.filter((t) => t.patientType === PatientType.EMERGENCY).length,
        paidPriority: tokens.filter((t) => t.patientType === PatientType.PAID_PRIORITY).length,
        followUp: tokens.filter((t) => t.patientType === PatientType.FOLLOW_UP).length,
        onlineBooking: tokens.filter((t) => t.patientType === PatientType.ONLINE_BOOKING).length,
        walkIn: tokens.filter((t) => t.patientType === PatientType.WALK_IN).length,
      },
      bumpedPatients: tokens.filter((t) => t.bumpCount > 0).length,
      totalBumps: tokens.reduce((sum, t) => sum + t.bumpCount, 0),
    };
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;