import express from 'express';
import { retrieveTopChunks, generateAnswer } from '../services/ragService.js';
import { getChunkCount, getAllChunks } from '../services/firebaseService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/query/ask
router.post('/ask', authenticateToken, async (req, res) => {
  try {
    const question = req.body?.question;
    const normalizedQuestion =
      typeof question === 'string' ? question.trim() : '';

    // Remove control characters to prevent prompt-breaking edge cases.
    const sanitizedQuestion = normalizedQuestion.replace(
      /[\u0000-\u001F\u007F]/g,
      ' '
    );

    if (!sanitizedQuestion) {
      return res.status(400).json({ error: 'Question cannot be empty.' });
    }
    if (sanitizedQuestion.length > 1000) {
      return res
        .status(400)
        .json({ error: 'Question too long (max 1000 characters).' });
    }

    const count = await getChunkCount();
    if (count === 0) {
      return res
        .status(400)
        .json({ error: 'No documents in DB. Please upload a PDF first.' });
    }

    const topChunks = await retrieveTopChunks(sanitizedQuestion, 5);
    const answer = await generateAnswer(sanitizedQuestion, topChunks);

    res.json({
      question: sanitizedQuestion,
      answer,
      sources: topChunks.map((c) => ({
        chunkIndex: c.chunkIndex,
        content: c.content.slice(0, 300) + (c.content.length > 300 ? '...' : ''),
        similarityScore: Number(c.score.toFixed(4)),
      })),
    });
  } catch (err) {
    console.error('Query error:', err);
    const message = err instanceof Error ? err.message : 'Query failed.';
    res.status(500).json({ error: message });
  }
});

// GET /api/query/chunks — for the Chunk Viewer tab (no embeddings, too large)
router.get('/chunks', authenticateToken, async (req, res) => {
  try {
    const chunks = await getAllChunks();
    const safe = chunks.map((c) => ({
      id: c.id,
      chunkIndex: c.chunkIndex,
      content: c.content,
      wordCount: c.wordCount,
      documentName: c.documentName,
      createdAt: c.createdAt,
      embeddingDimensions: Array.isArray(c.embedding) ? c.embedding.length : 0,
      embeddingPreview: Array.isArray(c.embedding) ? c.embedding.slice(0, 5) : [],
    }));
    res.json({ count: safe.length, chunks: safe });
  } catch (err) {
    console.error('Chunks error:', err);
    const message = err instanceof Error ? err.message : 'Failed to load chunks.';
    res.status(500).json({ error: message });
  }
});

export default router;

