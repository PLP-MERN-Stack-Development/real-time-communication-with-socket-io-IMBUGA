// client/src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSocket as useSocketHook } from '../socket/socket';

const SocketContext = createContext();

// Export the useSocket hook
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const socketData = useSocketHook();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeRoom, setActiveRoom] = useState('general');
  const [roomUsers, setRoomUsers] = useState(new Map());

  // Listen for join_success event from socket
  useEffect(() => {
    const handleJoinSuccess = (data) => {
      console.log('✅ Join success received:', data);
      if (data.user) {
        setCurrentUser(data.user);
        setActiveRoom(data.user.room);
      }
    };

    if (socketData.socket) {
      socketData.socket.on('join_success', handleJoinSuccess);
    }

    return () => {
      if (socketData.socket) {
        socketData.socket.off('join_success', handleJoinSuccess);
      }
    };
  }, [socketData.socket]);

  // Sync current room with socket data
  useEffect(() => {
    if (socketData.currentRoom) {
      setActiveRoom(socketData.currentRoom);
    }
  }, [socketData.currentRoom]);

  // Update room users when user list changes
  useEffect(() => {
    if (socketData.users && socketData.users.length > 0) {
      const usersMap = new Map();
      socketData.users.forEach(user => {
        usersMap.set(user.id, user);
      });
      setRoomUsers(usersMap);
    } else {
      setRoomUsers(new Map()); // Reset if no users
    }
  }, [socketData.users]);

  const joinRoom = (userData) => {
    console.log('🚀 Joining room with:', userData);
    // Set user optimistically while waiting for server confirmation
    const optimisticUser = {
      id: 'temp-' + Date.now(), // Temporary ID until server assigns real one
      username: userData.username,
      room: userData.room || 'general'
    };
    setCurrentUser(optimisticUser);
    setActiveRoom(userData.room || 'general');
    
    // Connect to server and join room
    socketData.connect(userData);
  };

  const leaveRoom = () => {
    console.log('👋 Leaving room');
    setCurrentUser(null);
    setRoomUsers(new Map());
    socketData.disconnect();
  };

  const switchRoom = (newRoom) => {
    if (currentUser) {
      console.log('🔄 Switching to room:', newRoom);
      const updatedUser = { ...currentUser, room: newRoom };
      setCurrentUser(updatedUser);
      setActiveRoom(newRoom);
      socketData.changeRoom(newRoom);
    }
  };

  const value = {
    ...socketData,
    currentUser,
    activeRoom,
    roomUsers,
    joinRoom,
    leaveRoom,
    switchRoom,
    setCurrentUser,
    sendFile: socketData.sendFile,
    reactToMessage: socketData.reactToMessage,
    markMessageRead: socketData.markMessageRead,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Also export the context itself if needed elsewhere
export { SocketContext };