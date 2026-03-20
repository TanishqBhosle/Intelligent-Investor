import { useState, useEffect } from 'react';
import axios from 'axios';
import AuthSection from './components/AuthSection';
import UploadSection from './components/UploadSection';
import QuerySection from './components/QuerySection';
import AnswerDisplay from './components/AnswerDisplay';
import ChunkViewer from './components/ChunkViewer';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PRESET_QUESTIONS = [
  'how to deal with brokerage houses?',
  'what is theory of diversification?',
  'how to become intelligent investor?',
  'how to do business valuation?',
  'what is putting all eggs in one basket analogy?',
];

export default function App() {
  const [user, setUser] = useState(null);
  const [ingestionStatus, setIngestionStatus] = useState(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');

  useEffect(() => {
    // Check for existing auth on mount
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  const handleAuth = (userData) => {
    setUser(userData);
    if (userData.role === 'user') {
      setActiveTab('query');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setAnswer(null);
    setActiveTab('upload');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 text-white font-sans flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              📚 Investment RAG System
            </h1>
            <p className="text-gray-400 text-sm">
              Powered by Gemini text-embedding-004 + Gemini 2.0 Flash
            </p>
          </div>
          <AuthSection onAuth={handleAuth} />
        </div>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 p-6 shadow-xl">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              📚 Investment RAG System
            </h1>
            <p className="text-blue-300 mt-1 text-sm">
              Powered by Gemini text-embedding-004 + Gemini 2.0 Flash · Firebase
              Firestore
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-300">Logged in as</p>
              <p className="font-semibold">{user.username} ({user.role})</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-all"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-2 p-4 bg-gray-900 border-b border-gray-700">
        {[
          ...(isAdmin ? [{ key: 'upload', label: '📤 Upload' }] : []),
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
        {activeTab === 'upload' && isAdmin && (
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

