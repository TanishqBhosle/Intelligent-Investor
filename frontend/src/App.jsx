import { useState } from 'react';
import UploadSection from './components/UploadSection';
import QuerySection from './components/QuerySection';
import AnswerDisplay from './components/AnswerDisplay';
import ChunkViewer from './components/ChunkViewer';

const PRESET_QUESTIONS = [
  'how to deal with brokerage houses?',
  'what is theory of diversification?',
  'how to become intelligent investor?',
  'how to do business valuation?',
  'what is putting all eggs in one basket analogy?',
];

export default function App() {
  const [ingestionStatus, setIngestionStatus] = useState(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 p-6 shadow-xl">
        <h1 className="text-3xl font-bold text-center tracking-tight">
          📚 Investment RAG System
        </h1>
        <p className="text-center text-blue-300 mt-1 text-sm">
          Powered by Gemini text-embedding-004 + Gemini 2.0 Flash · Firebase
          Firestore
        </p>
      </div>

      <div className="flex justify-center gap-2 p-4 bg-gray-900 border-b border-gray-700">
        {[
          { key: 'upload', label: '📤 Upload' },
          { key: 'query', label: '🔍 Query' },
          { key: 'chunks', label: '🗄️ Chunks' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {activeTab === 'upload' && (
          <UploadSection
            onStatusUpdate={setIngestionStatus}
            isIngesting={isIngesting}
            setIsIngesting={setIsIngesting}
            status={ingestionStatus}
          />
        )}

        {activeTab === 'query' && (
          <>
            <QuerySection
              presetQuestions={PRESET_QUESTIONS}
              onAnswer={setAnswer}
              isQuerying={isQuerying}
              setIsQuerying={setIsQuerying}
            />
            {answer && <AnswerDisplay result={answer} />}
          </>
        )}

        {activeTab === 'chunks' && <ChunkViewer />}
      </div>
    </div>
  );
}

