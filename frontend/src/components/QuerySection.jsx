import { useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function QuerySection({
  presetQuestions,
  onAnswer,
  isQuerying,
  setIsQuerying,
}) {
  const [question, setQuestion] = useState('');
  const [activePreset, setActivePreset] = useState(null);

  const askQuestion = async (q) => {
    const finalQ = (q || question).trim();
    if (!finalQ) {
      alert('Please enter or select a question.');
      return;
    }

    setIsQuerying(true);
    onAnswer(null);

    try {
      const { data } = await axios.post(`${API}/api/query/ask`, {
        question: finalQ,
      });
      onAnswer(data);
    } catch (err) {
      onAnswer({ error: err.response?.data?.error || err.message });
    } finally {
      setIsQuerying(false);
      setActivePreset(null);
    }
  };

  return (
    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 space-y-5">
      <div>
        <h2 className="text-xl font-semibold">🔍 Step 2: Query the RAG System</h2>
        <p className="text-gray-400 text-sm mt-1">
          Select one of the 5 mandatory questions or type your own.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider">
          Mandatory Test Questions
        </p>
        {presetQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => {
              setActivePreset(i);
              setQuestion(q);
              askQuestion(q);
            }}
            disabled={isQuerying}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed border ${
              activePreset === i && isQuerying
                ? 'bg-indigo-800 border-indigo-500 text-white'
                : 'bg-gray-700 border-gray-600 hover:bg-indigo-800 hover:border-indigo-500'
            }`}
          >
            <span className="text-indigo-400 font-bold mr-2">Q{i + 1}.</span>
            {q}
            {activePreset === i && isQuerying && (
              <span className="ml-2 text-yellow-400 animate-pulse">⏳ Querying...</span>
            )}
          </button>
        ))}
      </div>

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          Custom Question
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isQuerying) askQuestion();
            }}
            placeholder="Type a custom question and press Enter..."
            className="flex-1 bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
          />
          <button
            onClick={() => askQuestion()}
            disabled={!question.trim() || isQuerying}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-semibold transition-all text-lg"
          >
            {isQuerying ? '⏳' : '➤'}
          </button>
        </div>
      </div>
    </div>
  );
}

