import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initFirebase } from './config/firebase.js';
import ingestRoutes from './routes/ingest.js';
import queryRoutes from './routes/query.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Basic hardening headers (keep CSP out to avoid breaking embedded content).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.disable('x-powered-by');

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);

app.use(express.json({ limit: '1mb' }));

// Init Firebase on startup (fail fast if config is wrong).
initFirebase();
console.log('✅ Firebase Firestore initialized');

app.use('/api/ingest', ingestRoutes);
app.use('/api/query', queryRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return;

  const isUploadRoute = req?.path === '/api/ingest/upload';
  const message = err instanceof Error ? err.message : 'Internal server error';

  // For upload endpoint, we keep responses JSON to avoid breaking parsers.
  if (isUploadRoute) {
    res.status(400).json({ error: message });
    return;
  }

  res.status(500).json({ error: 'Internal server error', details: message });
});

app.listen(PORT, () => {
  console.log(`🚀 RAG Backend running → http://localhost:${PORT}`);
  console.log('🤖 Using: text-embedding-004 + gemini-2.0-flash');
});

