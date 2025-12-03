import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const SimpleTest = () => {
  const { user, isAuthenticated, isAdmin, isLoading, login } = useAuth();
  const [testResult, setTestResult] = useState('');

  const testLogin = async () => {
    try {
      setTestResult('Testing login...');
      const result = await login('admin@basira.com', 'admin123456');
      setTestResult(`Login result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    } catch (error) {
      setTestResult(`Login error: ${error.message}`);
    }
  };

  const checkStorage = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    setTestResult(`Storage check - Token: ${token ? 'EXISTS' : 'NULL'}, User: ${user ? 'EXISTS' : 'NULL'}`);
  };

  const clearStorage = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setTestResult('Storage cleared');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Simple Authentication Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Current State</h2>
          <div className="space-y-2">
            <div><strong>Loading:</strong> {isLoading.toString()}</div>
            <div><strong>Authenticated:</strong> {isAuthenticated.toString()}</div>
            <div><strong>Admin:</strong> {isAdmin.toString()}</div>
            <div><strong>User:</strong> {user ? `${user.name} (${user.role})` : 'None'}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-y-4">
            <button
              onClick={testLogin}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Test Login
            </button>
            
            <button
              onClick={checkStorage}
              className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
            >
              Check Storage
            </button>
            
            <button
              onClick={clearStorage}
              className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
            >
              Clear Storage
            </button>
          </div>
        </div>

        {testResult && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Result</h2>
            <p className="text-lg">{testResult}</p>
          </div>
        )}

        <div className="mt-8 flex space-x-4">
          <a href="/admin/login" className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700">
            Go to Admin Login
          </a>
          <a href="/admin" className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700">
            Go to Admin Dashboard
          </a>
          <a href="/" className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default SimpleTest;
