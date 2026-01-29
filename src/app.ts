import express from 'express';
import cors from 'cors';
import { initializeSystem, getSystemOverview } from './store/seedData';
import doctorRoutes from './routes/doctor.routes';
import slotRoutes from './routes/slot.routes';
import tokenRoutes from './routes/token.routes';
import systemRoutes from './routes/system.routes';
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/system', systemRoutes);

// Initialize system on startup
initializeSystem();

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// System overview endpoint
app.get('/api/system/overview', (_req, res) => {
  try {
    const overview = getSystemOverview();
    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// System reset endpoint (useful for testing)
app.post('/api/system/reset', (_req, res) => {
  try {
    initializeSystem();
    res.json({
      success: true,
      message: 'System reset and reinitialized',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/debug', (req, res) => {
  res.json({ received: req.body });
});


// API Routes
app.use('/api/doctors', doctorRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/tokens', tokenRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

export default app;