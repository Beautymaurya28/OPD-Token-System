import { Router, Request, Response } from 'express';
import { store } from '../store/memoryStore';
import { doctorIdParamSchema } from '../validators/schemas';

const router = Router();

/**
 * GET /api/doctors
 * Get all doctors
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const doctors = store.getAllDoctors();
    
    res.json({
      success: true,
      data: doctors,
      count: doctors.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/doctors/:doctorId
 * Get specific doctor details
 */
router.get('/:doctorId', (req: Request, res: Response) => {
  try {
    const { doctorId } = doctorIdParamSchema.parse(req.params);
    
    const doctor = store.getDoctor(doctorId);
    
    if (!doctor) {
      res.status(404).json({
        success: false,
        error: 'Doctor not found',
      });
      return;
    }
    
    res.json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Validation error',
    });
  }
});

/**
 * GET /api/doctors/:doctorId/slots
 * Get all slots for a doctor
 */
router.get('/:doctorId/slots', (req: Request, res: Response) => {
  try {
    const { doctorId } = doctorIdParamSchema.parse(req.params);
    
    const doctor = store.getDoctor(doctorId);
    
    if (!doctor) {
      res.status(404).json({
        success: false,
        error: 'Doctor not found',
      });
      return;
    }
    
    const slots = store.getSlotsByDoctor(doctorId);
    
    // Add utilization info
    const slotsWithInfo = slots.map((slot) => ({
      ...slot,
      utilization: `${slot.currentLoad}/${slot.maxCapacity}`,
      utilizationPercentage: (slot.currentLoad / slot.maxCapacity) * 100,
      waitlistCount: slot.waitlist.length,
    }));
    
    res.json({
      success: true,
      data: {
        doctor: {
          id: doctor.id,
          name: doctor.name,
          specialization: doctor.specialization,
        },
        slots: slotsWithInfo,
        totalSlots: slots.length,
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