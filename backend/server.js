import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initFirebase } from './config/firebase.js';
import authRoutes from './routes/auth.js';
import ingestRoutes from './routes/ingest.js';
import queryRoutes from './routes/query.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.disable('x-powered-by');

// Handle CORS for multiple origins - FIXED VERSION
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without origin (like mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    const allowedOrigins = process.env.FRONTEND_URL?.split(',') || ['http://localhost:5173'];
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '100kb' }));

// Init Firebase on startup (fail fast if config is wrong).
let firebaseReady = false;
try {
  initFirebase();
  firebaseReady = true;
  console.log('✅ Firebase Firestore initialized');
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.warn('⚠️ Firebase init failed (backend will still start):', message);
}

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/ingest', ingestRoutes);
app.use('/api/query', queryRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    firebaseReady,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler - IMPROVED
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return;

  const isUploadRoute = req?.path === '/api/ingest/upload';
  const isAuthRoute = req?.path?.startsWith('/api/auth');
  
  // Generic error message for production - don't expose internal details
  let message = 'Internal server error';
  
  // Only expose specific error messages for development or known safe errors
  if (process.env.NODE_ENV === 'development' || 
      (isUploadRoute && err.message.includes('Only PDF files are allowed')) ||
      (isAuthRoute && ['Invalid credentials', 'Username and password required', 'Username already exists'].includes(err.message))) {
    message = err instanceof Error ? err.message : 'Internal server error';
  }

  // For upload endpoint, we keep responses JSON to avoid breaking parsers.
  if (isUploadRoute) {
    res.status(400).json({ error: message });
    return;
  }

  res.status(500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`🚀 RAG Backend running → http://localhost:${PORT}`);
  console.log('🤖 Using: text-embedding-004 + gemini-2.0-flash');
});

