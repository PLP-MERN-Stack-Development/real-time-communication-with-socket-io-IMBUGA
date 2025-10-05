// client/src/App.jsx
import React, { useState } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import Login from './components/Login';
import ChatRoom from './components/ChatRoom';
import './App.css';

const AppContent = () => {
  const [user, setUser] = useState(null);
  const { isConnected, leaveRoom } = useSocket();

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    leaveRoom();
    setUser(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>💬 Socket.io Chat</h1>
          <div className="header-info">
            {user && (
              <>
                <span className="user-info">
                  Welcome, <strong>{user.username}</strong> | Room: <strong>#{user.room}</strong>
                </span>
                <button onClick={handleLogout} className="logout-button">
                  Leave Chat
                </button>
              </>
            )}
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              ● {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {!user ? (
          <Login onLogin={handleLogin} />
        ) : (
          <ChatRoom />
        )}
      </main>

      <footer className="app-footer">
        <p>Beyond exception!</p>
      </footer>
    </div>
  );
};

// Make sure this is the default export
const App = () => {
  return (
    <SocketProvider>
      <AppContent />
    </SocketProvider>
  );
};

export default App; // This is the crucial line that was missing