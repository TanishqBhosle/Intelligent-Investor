import { getDb } from '../config/firebase.js';
import { v4 as uuidv4 } from 'uuid';

const COLLECTION = 'rag_chunks';
const BATCH_LIMIT = 400; // stay under Firestore 500 doc write limit
const DELETE_BATCH_LIMIT = 400; // stay under Firestore 500 doc delete limit

function validateVector(vec) {
  return (
    Array.isArray(vec) &&
    vec.length > 0 &&
    vec.every((v) => typeof v === 'number' && Number.isFinite(v))
  );
}

export async function saveChunks(chunks, embeddings, documentName) {
  const db = getDb();

  if (!Array.isArray(chunks) || chunks.length === 0) {
    throw new Error('saveChunks: chunks must be a non-empty array.');
  }
  if (!Array.isArray(embeddings) || embeddings.length !== chunks.length) {
    throw new Error(
      `saveChunks: embeddings length (${embeddings?.length ?? 0}) must match chunks length (${chunks.length}).`
    );
  }
  if (typeof documentName !== 'string' || documentName.trim().length === 0) {
    documentName = 'uploaded-document';
  }

  const safeDocumentName = documentName.trim().slice(0, 200);
  const savedIds = [];
  const timestamp = new Date().toISOString();

  for (let i = 0; i < chunks.length; i += BATCH_LIMIT) {
    const batchChunks = chunks.slice(i, i + BATCH_LIMIT);
    const batchEmbeddings = embeddings.slice(i, i + BATCH_LIMIT);
    const writeBatch = db.batch();

    for (let j = 0; j < batchChunks.length; j++) {
      const docId = uuidv4();
      const docRef = db.collection(COLLECTION).doc(docId);
      const chunk = batchChunks[j];
      const embedding = batchEmbeddings[j];

      if (!validateVector(embedding)) {
        throw new Error(`Invalid embedding vector for chunk ${chunk?.index ?? j}.`);
      }

      writeBatch.set(docRef, {
        id: docId,
        documentName: safeDocumentName,
        chunkIndex: chunk.index,
        content: chunk.content,
        wordCount: chunk.wordCount,
        embedding,
        createdAt: timestamp,
      });

      savedIds.push(docId);
    }

    await writeBatch.commit();
  }

  return savedIds;
}

export async function getAllChunks() {
  const db = getDb();
  const snapshot = await db
    .collection(COLLECTION)
    .orderBy('chunkIndex')
    .get();

  if (snapshot.empty) return [];
  return snapshot.docs.map((doc) => doc.data());
}

export async function getChunkCount() {
  const db = getDb();
  const snapshot = await db.collection(COLLECTION).count().get();
  return snapshot.data().count;
}

export async function clearCollection() {
  const db = getDb();
  // Delete in batches so we never exceed the 500 operation limit.
  while (true) {
    const snapshot = await db
      .collection(COLLECTION)
      .limit(DELETE_BATCH_LIMIT)
      .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

