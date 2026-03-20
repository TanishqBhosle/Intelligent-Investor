import { GoogleGenerativeAI } from '@google/generative-ai';

function assertGeminiKey() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY in environment.');
  }
}

function isRetryable(err) {
  // The SDK error shape can vary; handle common cases defensively.
  const status =
    err?.status ??
    err?.response?.status ??
    err?.response?.statusCode ??
    err?.response?.data?.status;
  return status === 429 || status >= 500;
}

async function withRetries(fn, { retries = 3, initialDelayMs = 500 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === retries) throw err;

      const delay = initialDelayMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

assertGeminiKey();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

export async function embedText(text) {
  if (typeof text !== 'string') {
    throw new Error('embedText: text must be a string.');
  }

  const input = text.slice(0, 9000);
  if (input.trim().length === 0) {
    throw new Error('embedText: text is empty after trimming.');
  }

  const result = await withRetries(() =>
    embeddingModel.embedContent(input)
  );

  const values = result?.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Gemini embedding returned no values.');
  }

  return values;
}

export async function embedBatch(texts, batchSize = 5) {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  if (!Number.isFinite(batchSize) || batchSize <= 0) {
    throw new Error('embedBatch: batchSize must be a positive number.');
  }

  const embeddings = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(
      batch.map((t) => embedText(t))
    );

    embeddings.push(...batchEmbeddings);

    // Rate limiting: wait between batches to avoid quota errors.
    if (i + batchSize < texts.length) {
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  return embeddings;
}

