import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

let genAIInstance = null;
let embeddingModelInstance = null;

// List of embedding models to try in order
const EMBEDDING_MODELS = [
  'gemini-embedding-001',
  'gemini-embedding-2-preview',
  'text-embedding-004'
];

function getEmbeddingModel() {
  if (embeddingModelInstance) return embeddingModelInstance;

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY in environment.');
  }

  // Initialize with GoogleGenerativeAI
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  genAIInstance = genAI;
  
  // Return the genAI instance since we'll call getGenerativeModel directly
  embeddingModelInstance = genAI;
  
  return embeddingModelInstance;
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

export async function embedText(text) {
  if (typeof text !== 'string') {
    throw new Error('embedText: text must be a string.');
  }

  const input = text.slice(0, 9000);
  if (input.trim().length === 0) {
    throw new Error('embedText: text is empty after trimming.');
  }

  let lastError;
  
  // Try each embedding model in order
  for (const modelName of EMBEDDING_MODELS) {
    try {
      console.log(`Trying embedding model: ${modelName}`);
      
      // Create a new GenAI instance for each attempt
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      
      let result;
      try {
        const embeddingModel = genAI.getGenerativeModel({ model: modelName });
        result = await withRetries(() => {
          return embeddingModel.embedContent({
            content: { parts: [{ text: input }] },
          });
        });
      } catch (sdkErr) {
        console.error(`SDK failed for model ${modelName}:`, sdkErr.message);
        
        // Try direct REST API call as fallback
        try {
          result = await withRetries(async () => {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent?key=${process.env.GEMINI_API_KEY}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: `models/${modelName}`,
                content: {
                  parts: [{ text: input }]
                }
              })
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }
            
            return await response.json();
          });
        } catch (apiErr) {
          console.error(`Direct API also failed for model ${modelName}:`, apiErr.message);
          throw apiErr;
        }
      }

      // Handle both SDK and API response formats
      const values = result?.embeddings?.[0]?.values || result?.embedding?.values;
      if (!Array.isArray(values) || values.length === 0) {
        throw new Error(`Model ${modelName} returned no embedding values.`);
      }

      console.log(`Successfully used model: ${modelName}`);
      return values;
      
    } catch (err) {
      lastError = err;
      console.error(`Model ${modelName} failed:`, err.message);
      continue; // Try next model
    }
  }
  
  // All models failed
  throw new Error(`All embedding models failed. Last error: ${lastError?.message || 'Unknown error'}. Please check your API key and region availability.`);
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

