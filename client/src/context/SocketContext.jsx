import React, { createContext, useContext, useEffect, useState } from 'react';
import { socket, useSocket as useSocketHook } from '../socket/socket';

const SocketContext = createContext();

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

  // Sync current room with socket data
  useEffect(() => {
    if (socketData.currentRoom) {
      setActiveRoom(socketData.currentRoom);
    }
  }, [socketData.currentRoom]);

  // Update room users when user list changes
  useEffect(() => {
    if (socketData.users.length > 0) {
      const usersMap = new Map();
      socketData.users.forEach(user => {
        usersMap.set(user.id, user);
      });
      setRoomUsers(usersMap);
    }
  }, [socketData.users]);

  const joinRoom = (userData) => {
    setCurrentUser(userData);
    socketData.connect(userData);
  };

  const leaveRoom = () => {
    setCurrentUser(null);
    socketData.disconnect();
  };

  const switchRoom = (newRoom) => {
    if (currentUser) {
      socketData.changeRoom(newRoom);
      setActiveRoom(newRoom);
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
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};