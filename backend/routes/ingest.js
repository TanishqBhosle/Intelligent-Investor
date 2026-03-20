import express from 'express';
import multer from 'multer';
import os from 'os';
import { fileTypeFromBuffer } from 'file-type';
import { parsePDF } from '../services/pdfParser.js';
import { chunkText } from '../services/chunker.js';
import { embedBatch } from '../services/embedder.js';
import { saveChunks, clearCollection } from '../services/firebaseService.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

let ingestionInProgress = false;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, os.tmpdir()),
  filename: (req, file, cb) => {
    const safeOriginal = String(file.originalname || 'upload.pdf')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 140);
    cb(null, `${Date.now()}_${safeOriginal}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: async (req, file, cb) => {
    // First check MIME type as basic filter
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed.'), false);
    }
    
    // We'll do file signature verification after the file is uploaded
    cb(null, true);
  },
});

// Temporary test endpoint without authentication for debugging
router.post('/upload-test', upload.single('pdf'), async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file received.' });
    }

    res.json({ 
      message: 'Test upload successful!',
      file: {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload test failed.';
    console.error('Upload test error:', err);
    res.status(500).json({ error: message });
  }
});

router.post('/upload', upload.single('pdf'), async (req, res) => {
  // Streaming NDJSON response for progress updates.
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.status(200);
  res.flushHeaders?.();

  const send = (obj) => {
    try {
      if (!res.writableEnded) res.write(JSON.stringify(obj) + '\n');
    } catch {
      // Ignore write errors; client disconnected.
    }
  };

  try {
    if (ingestionInProgress) {
      send({
        step: 'error',
        message: 'Another ingestion is currently in progress. Please try again in a moment.',
      });
      res.end();
      return;
    }

    ingestionInProgress = true;

    if (!req.file) {
      send({ step: 'error', message: 'No PDF file received.' });
      res.end();
      return;
    }

    const tmpPath = req.file.path;
    const documentName = req.file.originalname || 'uploaded-document';

    // FILE SIGNATURE VERIFICATION - NEW SECURITY CHECK
    try {
      const fs = await import('fs');
      const fileBuffer = fs.readFileSync(tmpPath);
      const fileType = await fileTypeFromBuffer(fileBuffer);
      
      if (!fileType || fileType.ext !== 'pdf') {
        send({ 
          step: 'error', 
          message: 'File signature verification failed. The uploaded file is not a valid PDF.' 
        });
        res.end();
        return;
      }
    } catch (signatureErr) {
      send({ 
        step: 'error', 
        message: 'Unable to verify file signature. The file may be corrupted.' 
      });
      res.end();
      return;
    }

    // Step 1: Parse
    send({ step: 'parsing', message: 'Parsing PDF text...' });
    const { text, numPages } = await parsePDF(tmpPath);

    // Step 2: Chunk
    send({ step: 'chunking', message: 'Chunking text...' });
    const chunks = chunkText(text, 800, 150);
    if (!chunks.length) {
      send({ step: 'error', message: 'No text chunks were produced from this PDF.' });
      res.end();
      return;
    }
    send({
      step: 'chunking',
      message: `Created ${chunks.length} chunks from ${numPages || 0} pages.`,
    });

    // Step 3: Embed
    send({
      step: 'embedding',
      message: `Embedding ${chunks.length} chunks with Gemini text-embedding-004...`,
    });
    const chunkTexts = chunks.map((c) => c.content);
    const embeddings = await embedBatch(chunkTexts, 5);
    if (embeddings.length !== chunks.length) {
      throw new Error('Embedding count mismatch. Please retry ingestion.');
    }

    // Step 4: Save
    send({ step: 'saving', message: 'Clearing old data and saving to Firestore...' });
    await clearCollection();
    const ids = await saveChunks(chunks, embeddings, documentName);

    send({
      step: 'done',
      message: '✅ Ingestion complete!',
      stats: { pages: numPages || 0, chunks: chunks.length, savedDocs: ids.length },
    });
    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ingestion failed.';
    console.error('Ingest error:', err);
    send({ step: 'error', message });
    res.end();
  } finally {
    ingestionInProgress = false;
  }
});

export default router;

