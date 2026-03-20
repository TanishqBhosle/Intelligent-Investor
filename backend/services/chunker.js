export function chunkText(text, chunkSize = 800, overlap = 150) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return [];
  }
  if (!Number.isFinite(chunkSize) || chunkSize < 200) {
    throw new Error('chunkText: chunkSize must be >= 200.');
  }
  if (!Number.isFinite(overlap) || overlap < 0) {
    throw new Error('chunkText: overlap must be >= 0.');
  }
  if (overlap >= chunkSize) {
    throw new Error('chunkText: overlap must be smaller than chunkSize.');
  }

  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  const chunks = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < cleaned.length) {
    let end = start + chunkSize;

    if (end < cleaned.length) {
      const sentenceEnd = cleaned.lastIndexOf('.', end);
      if (sentenceEnd > start + chunkSize * 0.5) {
        end = sentenceEnd + 1;
      }
    }

    const chunkContent = cleaned.slice(start, end).trim();
    if (chunkContent.length > 50) {
      chunks.push({
        index: chunkIndex++,
        content: chunkContent,
        charStart: start,
        charEnd: end,
        wordCount: chunkContent.split(/\s+/).length,
      });
    }

    // Ensure progress to avoid infinite loops.
    const nextStart = end - overlap;
    if (nextStart <= start) break;
    start = nextStart;
  }

  return chunks;
}

