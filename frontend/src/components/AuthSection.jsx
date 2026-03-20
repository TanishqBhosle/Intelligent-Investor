import { useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AuthSection({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin ? { username, password } : { username, password, role };
      
      const { data } = await axios.post(`${API}${endpoint}`, payload);
      
      // Store token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Set default axios header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      onAuth(data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6">
        {isLogin ? '🔐 Login' : '👤 Register'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 text-white"
            placeholder="Enter username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="6"
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 text-white"
            placeholder="Enter password (min 6 chars)"
          />
        </div>

        {!isLogin && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 text-white"
            >
              <option value="user">User (can query only)</option>
              <option value="admin">Admin (can upload & query)</option>
            </select>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !username || !password}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
        >
          {isLoading ? '⏳ Processing...' : isLogin ? '🚀 Login' : '📝 Register'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
        >
          {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p>📋 Demo Credentials:</p>
        <p>• Admin: username=<code className="bg-gray-700 px-1 rounded">admin</code>, password=<code className="bg-gray-700 px-1 rounded">admin123</code></p>
        <p>• User: username=<code className="bg-gray-700 px-1 rounded">user</code>, password=<code className="bg-gray-700 px-1 rounded">user123</code></p>
      </div>
    </div>
  );
}
