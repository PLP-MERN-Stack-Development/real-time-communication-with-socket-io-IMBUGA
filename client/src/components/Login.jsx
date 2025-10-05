import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('general');
  const [availableRooms, setAvailableRooms] = useState(['general', 'random', 'tech', 'support']);
  const { joinRoom, isConnected } = useSocket();

  useEffect(() => {
    // Fetch available rooms from server
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

    const userData = {
      username: username.trim(),
      room
    };

    joinRoom(userData);
    onLogin(userData);
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Join Chat Room</h2>
        
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
          Status: {isConnected ? 'Connected' : 'Disconnected'}
        </div>

        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
            minLength={2}
            maxLength={20}
            className="form-input"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="room">Room:</label>
          <select
            id="room"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="form-select"
          >
            {availableRooms.map(room => (
              <option key={room} value={room}>
                {room.charAt(0).toUpperCase() + room.slice(1)} 
                {room === 'general' && ' (Default)'}
              </option>
            ))}
          </select>
        </div>
        
        <button 
          type="submit" 
          disabled={!username.trim() || !isConnected}
          className="join-button"
        >
          {isConnected ? 'Join Chat Room' : 'Connecting...'}
        </button>

        <div className="login-info">
          <p>• Choose a unique username</p>
          <p>• Select your preferred room</p>
          <p>• Start chatting in real-time!</p>
        </div>
      </form>
    </div>
  );
};

export default Login;