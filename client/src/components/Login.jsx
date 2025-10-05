// client/src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('general');
  const [availableRooms, setAvailableRooms] = useState(['general', 'random', 'tech', 'support']);
  const { joinRoom, isConnected, connectionError, joinSuccess } = useSocket();
  const [isLoading, setIsLoading] = useState(false);

  // Auto-redirect on successful join
  useEffect(() => {
    if (joinSuccess) {
      console.log('✅ Login successful, redirecting to chat...');
      // Pass user data to App.jsx
      onLogin({ username, room });
      setIsLoading(false);
    }
  }, [joinSuccess, username, room, onLogin]);

  // Fetch available rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/rooms');
        if (response.ok) {
          const roomsData = await response.json();
          setAvailableRooms(roomsData.map(room => room.name));
        }
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
      }
    };

    fetchRooms();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    console.log('🔄 Attempting login...', { username, room });
    setIsLoading(true);

    const userData = {
      username: username.trim(),
      room
    };

    // This will trigger the socket connection and join_success event
    joinRoom(userData);

    // Timeout after 5 seconds if no response
    setTimeout(() => {
      if (!joinSuccess && isLoading) {
        console.log('⏰ Login timeout');
        setIsLoading(false);
      }
    }, 5000);
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Join Chat Room</h2>
        
        {/* Connection Status */}
        <div className="connection-status login-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
          <div>
            <div>
              <strong>Status:</strong> {isConnected ? 'Connected to Server ✅' : 'Disconnected from Server ❌'}
            </div>
            {connectionError && (
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: '#ff6b6b' }}>
                <strong>Error:</strong> {connectionError}
              </div>
            )}
            {isLoading && (
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: '#ffcc00' }}>
                Connecting to chat room...
              </div>
            )}
          </div>
        </div>

        {/* Username Input */}
        <div className="form-group">
          <label htmlFor="username">Choose a Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username(any)"
            required
            minLength={2}
            maxLength={20}
            className="form-input"
            disabled={isLoading}
          />
        </div>
        
        {/* Room Selection */}
        <div className="form-group">
          <label htmlFor="room">Chat Room:</label>
          <select
            id="room"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="form-select"
            disabled={isLoading}
          >
            {availableRooms.map(room => (
              <option key={room} value={room}>
                {room} {room === 'general' && '(Default)'}
              </option>
            ))}
          </select>
        </div>
        
        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={!username.trim() || isLoading}
          className="join-button"
        >
          {isLoading ? 'Joining Chat...' : 'Join Chat Room'}
        </button>

        {/* Help Info */}
        <div className="login-info">
          <p>• Start chatting instantly!</p>
        </div>
      </form>
    </div>
  );
};

export default Login;