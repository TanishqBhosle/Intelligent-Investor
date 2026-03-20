import { useState, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function UploadSection({
  onStatusUpdate,
  isIngesting,
  setIsIngesting,
  status,
}) {
  const [file, setFile] = useState(null);
  const [logs, setLogs] = useState([]);
  const fileRef = useRef(null);

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a PDF file first.');
      return;
    }

    setIsIngesting(true);
    setLogs([]);
    onStatusUpdate(null);

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await fetch(`${API}/api/ingest/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // In case backend errors before streaming starts.
        let errText = '';
        try {
          const maybeJson = await response.json();
          errText = maybeJson?.error || JSON.stringify(maybeJson);
        } catch {
          errText = await response.text();
        }
        throw new Error(errText || 'Upload failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Upload failed: no response body reader.');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // NDJSON framing: each JSON object is on its own line.
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            setLogs((prev) => [...prev, parsed]);
            if (parsed.step === 'done') onStatusUpdate(parsed.stats);
          } catch {
            // If a line is incomplete/malformed, keep it out of UI logs.
          }
        }
      }

      // Flush any remaining buffered JSON line.
      const last = buffer.trim();
      if (last) {
        try {
          const parsed = JSON.parse(last);
          setLogs((prev) => [...prev, parsed]);
          if (parsed.step === 'done') onStatusUpdate(parsed.stats);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { step: 'error', message: err instanceof Error ? err.message : String(err) },
      ]);
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-1">📤 Step 1: Upload Investment PDF</h2>
        <p className="text-gray-400 text-sm mb-4">
          Supports text-based PDFs up to 50MB. The system will chunk, embed with Gemini, and store
          in Firebase.
        </p>

        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-blue-500 rounded-xl p-10 text-center cursor-pointer hover:bg-blue-950/40 transition-all"
        >
          {file ? (
            <p className="text-green-400 font-medium text-lg">✅ {file.name}</p>
          ) : (
            <>
              <p className="text-4xl mb-2">📄</p>
              <p className="text-gray-400">Click to select PDF (max 50MB)</p>
            </>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const nextFile = e.target.files?.[0] ?? null;
              setFile(nextFile);
              setLogs([]);
              onStatusUpdate(null);
            }}
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || isIngesting}
          className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-semibold text-lg transition-all"
        >
          {isIngesting ? '⚙️ Processing — please wait...' : '🚀 Ingest PDF into RAG System'}
        </button>
      </div>

      {logs.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-700 font-mono text-sm space-y-2">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Pipeline Log</p>
          {logs.map((log, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 ${
                log.step === 'done'
                  ? 'text-green-400'
                  : log.step === 'error'
                  ? 'text-red-400'
                  : 'text-blue-300'
              }`}
            >
              <span className="mt-0.5">
                {log.step === 'done' ? '✅' : log.step === 'error' ? '❌' : '⚙️'}
              </span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      )}

      {status && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'PDF Pages', value: status.pages, icon: '📄' },
            { label: 'Text Chunks', value: status.chunks, icon: '🧩' },
            { label: 'Saved in DB', value: status.savedDocs, icon: '🗄️' },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-indigo-950 rounded-xl p-4 text-center border border-indigo-700"
            >
              <div className="text-3xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-indigo-300 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

