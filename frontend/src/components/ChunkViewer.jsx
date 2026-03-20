import { useEffect, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ChunkViewer() {
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchChunks = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API}/api/query/chunks`);
      setChunks(data.chunks);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChunks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading)
    return (
      <div className="text-center py-24 text-gray-400 animate-pulse">
        ⏳ Loading chunks from Firebase Firestore...
      </div>
    );

  if (error)
    return (
      <div className="text-red-400 bg-red-950 border border-red-700 rounded-xl p-5">
        ❌ {error}
      </div>
    );

  if (!chunks.length)
    return (
      <div className="text-center py-24 text-gray-500">
        <p className="text-4xl mb-3">🗄️</p>
        <p>No chunks found. Upload a PDF in the Upload tab first.</p>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          🗄️ Firebase Chunks
          <span className="ml-2 text-sm font-normal text-indigo-400">
            ({chunks.length} total)
          </span>
        </h2>
        <button
          onClick={fetchChunks}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-all"
        >
          🔄 Refresh
        </button>
      </div>

      {chunks.map((chunk, i) => (
        <div key={chunk.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex flex-wrap justify-between text-xs text-gray-400 mb-2 gap-1">
            <span>Chunk #{chunk.chunkIndex}</span>
            <span>{chunk.wordCount} words</span>
            <span className="text-blue-400 truncate max-w-[200px]">
              {chunk.documentName}
            </span>
            <span>{chunk.createdAt?.slice(0, 10)}</span>
          </div>

          <p className="text-gray-200 text-sm leading-relaxed">{chunk.content}</p>

          {i < 2 && chunk.embeddingPreview?.length > 0 && (
            <div className="mt-3 bg-gray-900 rounded-lg p-3 border border-indigo-900">
              <p className="text-indigo-400 text-xs font-mono font-bold mb-1">
                🔢 Gemini Embedding Vector ({chunk.embeddingDimensions} dimensions)
              </p>
              <p className="text-green-300 text-xs font-mono break-all">
                [ {chunk.embeddingPreview.map((v) => v.toFixed(8)).join(', ')} , ... ]
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Showing first {chunk.embeddingPreview.length} float values
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

