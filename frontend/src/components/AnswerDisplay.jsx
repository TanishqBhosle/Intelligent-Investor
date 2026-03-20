export default function AnswerDisplay({ result }) {
  if (result?.error) {
    return (
      <div className="mt-4 bg-red-950 border border-red-700 rounded-2xl p-5 text-red-300">
        <p className="font-bold mb-1">❌ Error</p>
        <p>{result.error}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="bg-gray-700 rounded-xl px-5 py-3 border border-gray-600">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Question</p>
        <p className="text-white font-medium">{result.question}</p>
      </div>

      <div className="bg-gray-800 border border-green-700 rounded-2xl p-6">
        <p className="text-green-400 font-bold text-sm uppercase tracking-wider mb-3">
          💡 Gemini Answer
        </p>
        <p className="text-gray-100 leading-relaxed whitespace-pre-wrap text-base">
          {result.answer}
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
        <p className="text-indigo-400 font-bold text-sm uppercase tracking-wider mb-3">
          📎 Top Retrieved Chunks (Cosine Similarity)
        </p>
        <div className="space-y-3">
          {result.sources?.map((s, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-600">
              <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                <span>
                  Source {i + 1} · Chunk #{s.chunkIndex}
                </span>
                <span
                  className={`font-mono font-bold ${
                    s.similarityScore > 0.7
                      ? 'text-green-400'
                      : s.similarityScore > 0.4
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  }`}
                >
                  Score: {s.similarityScore}
                </span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{s.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

