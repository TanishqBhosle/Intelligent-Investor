import fs from 'fs';
import pdfParse from 'pdf-parse';

export async function parsePDF(filePath) {
  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new Error('parsePDF: filePath is required.');
  }

  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    const text = typeof data?.text === 'string' ? data.text : '';
    if (text.trim().length === 0) {
      throw new Error(
        'PDF appears to be empty or contains scanned images. Please upload a text-based PDF.'
      );
    }

    return {
      text,
      numPages: Number.isFinite(data?.numpages) ? data.numpages : 0,
      info: data?.info ?? null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown PDF parsing error.';
    throw new Error(`PDF parsing failed: ${msg}`);
  } finally {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // Best-effort cleanup; do not mask the original error.
    }
  }
}

