import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import scanRoutes from './routes/scanRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import stripeRoutes from './routes/stripeRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import riskRoutes from './routes/riskRoutes.js';
import complianceRoutes from './routes/complianceRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import userProfileRoutes from './routes/userProfileRoutes.js';

const app = express();

// Stripe webhook needs raw body – mount BEFORE json parser
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Security & utility middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limit
app.use('/api', generalLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/risks', riskRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/activity', auditLogRoutes);
app.use('/api/profile', userProfileRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

export default app;
