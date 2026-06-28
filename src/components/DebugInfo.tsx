import React from 'react';
import { realDebridService } from '../services/realDebridService';
import { realDebridKeyManager } from '../services/realDebridKeyManager';
import { useAuth } from '../contexts/AuthContext';

const DebugInfo: React.FC = () => {
  const { user } = useAuth();
  const isConfigured = realDebridService.isConfigured();
  const hasUserKey = realDebridKeyManager.hasUserApiKey();

  const testApiKey = async () => {
    try {
      const isValid = await realDebridService.testApiKey();

      alert(`API Key Test: ${isValid ? 'VALID' : 'INVALID'}`);
    } catch (error) {
      console.error('API Key Test Error:', error);
      alert(`API Key Test Error: ${error}`);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        background: 'rgba(0,0,0,0.9)',
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: 9999,
        maxWidth: '300px',
      }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>🔧 Debug Info</h4>
      <div>
        <strong>Real-Debrid Configured:</strong>{' '}
        {isConfigured ? '✅ YES' : '❌ NO'}
      </div>
      <div>
        <strong>User API Key (Account Settings):</strong>{' '}
        {user?.hasRealDebridKey ? '✅ YES' : '❌ NO'}
      </div>
      <div>
        <strong>Key Source:</strong>{' '}
        {hasUserKey ? '👤 User Account (server-side)' : '❌ None'}
      </div>
      <div>
        <strong>Environment:</strong> {process.env.NODE_ENV}
      </div>
      <button
        onClick={testApiKey}
        style={{
          marginTop: '10px',
          padding: '5px 10px',
          background: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}>
        Test API Key
      </button>
      <div style={{ marginTop: '10px', fontSize: '11px', opacity: 0.8 }}>
        💡 Check browser console for TorrentActions debug logs
      </div>
    </div>
  );
};

export default DebugInfo;
