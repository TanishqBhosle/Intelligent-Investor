import { GoogleGenerativeAI } from '@google/generative-ai';
import { embedText } from './embedder.js';
import { getAllChunks } from './firebaseService.js';

function assertGeminiKey() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY in environment.');
  }
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  if (a.length !== b.length) {
    throw new Error(
      `cosineSimilarity: vector length mismatch (${a.length} vs ${b.length}).`
    );
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    dot += ai * bi;
    normA += ai ** 2;
    normB += bi ** 2;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

assertGeminiKey();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const generationModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

export async function retrieveTopChunks(query, topK = 5) {
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('retrieveTopChunks: query must be a non-empty string.');
  }
  if (!Number.isFinite(topK) || topK <= 0) {
    throw new Error('retrieveTopChunks: topK must be a positive number.');
  }

  const queryEmbedding = await embedText(query);
  const allChunks = await getAllChunks();

  if (allChunks.length === 0) {
    throw new Error('No chunks in database. Please upload a PDF first.');
  }

  const scored = [];
  for (const chunk of allChunks) {
    const emb = chunk?.embedding;
    if (!Array.isArray(emb)) continue;
    // Keep strict similarity; mismatch indicates corrupted data.
    const score = cosineSimilarity(queryEmbedding, emb);
    scored.push({ ...chunk, score });
  }

  if (scored.length === 0) {
    throw new Error('Failed to compute similarity scores (no valid embeddings found).');
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.min(topK, scored.length));
}

export async function generateAnswer(query, topChunks) {
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('generateAnswer: query must be a non-empty string.');
  }
  if (!Array.isArray(topChunks) || topChunks.length === 0) {
    throw new Error('generateAnswer: topChunks must be a non-empty array.');
  }

  const context = topChunks
    .map(
      (c, i) =>
        `Source ${i + 1} (Chunk #${c.chunkIndex}):\n${c.content}`
    )
    .join('\n\n---\n\n');

  const prompt = `You are an expert investment analyst assistant.
Goal: Answer the user question using ONLY the provided textbook context.

Strict grounding rules:
- Do not use any external knowledge or assumptions.
- Every paragraph of your answer must end with an inline citation like: [Source 2]
- If the context does not contain enough information, say so explicitly (and do not guess).

Return format:
1) Write the answer as clear markdown.
2) Do not include any content outside the context.

Context:
${context}

Question: ${query}
Answer:`;

  const generationConfig = {
    // Keep responses bounded for consistent UX.
    maxOutputTokens: 900,
    temperature: 0.2,
    topP: 0.9,
  };

  const result = await generationModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  }, { generationConfig });

  const response = result?.response;
  const text = response?.text?.();
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Gemini generation returned empty output.');
  }

  return text;
}

