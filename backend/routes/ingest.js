import express from 'express';
import multer from 'multer';
import os from 'os';
import { parsePDF } from '../services/pdfParser.js';
import { chunkText } from '../services/chunker.js';
import { embedBatch } from '../services/embedder.js';
import { saveChunks, clearCollection } from '../services/firebaseService.js';

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
  fileFilter: (req, file, cb) => {
    // Rely on client mimetype as a first filter; parsing will still validate content.
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed.'), false);
      return;
    }
    cb(null, true);
  },
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

