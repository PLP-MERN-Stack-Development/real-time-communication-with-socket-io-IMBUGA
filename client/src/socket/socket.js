// client/src/socket/socket.js
import { io } from 'socket.io-client';
import { useEffect, useState, useCallback } from 'react';

// Use explicit URL - remove env variable for now
const SOCKET_URL = 'http://localhost:5000';

// Create socket instance with better configuration
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000,
  transports: ['websocket', 'polling'] // Try both
});

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [connectionError, setConnectionError] = useState(null);
  const [joinSuccess, setJoinSuccess] = useState(false);

  // Connect to server
  const connect = useCallback((userData) => {
    console.log('🔄 Attempting to connect...');
    setConnectionError(null);
    
    socket.connect();
    
    // If already connected, join immediately
    if (socket.connected) {
      console.log('✅ Already connected, joining room...');
      socket.emit('user_join', userData);
      setCurrentRoom(userData.room || 'general');
    } else {
      // Wait for connection then join
      const onConnect = () => {
        console.log('✅ Connected, now joining room...');
        socket.emit('user_join', userData);
        setCurrentRoom(userData.room || 'general');
      };
      socket.once('connect', onConnect);
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    socket.disconnect();
    setIsConnected(false);
    setJoinSuccess(false);
  }, []);

  // Send message
  const sendMessage = useCallback((messageData) => {
    if (!socket.connected) {
      console.error('Cannot send message: Not connected');
      return;
    }
    socket.emit('send_message', messageData);
  }, []);

  // Send file
  const sendFile = useCallback((fileData) => {
    if (!socket.connected) {
      console.error('Cannot send file: Not connected');
      return false;
    }
    
    const messageData = {
      type: 'file',
      fileData: fileData,
      timestamp: new Date().toISOString()
    };
    
    // Optimistically add file message
    setMessages(prev => [...prev, {
      ...messageData,
      sender: 'You',
      senderId: socket.id,
      tempId: Date.now().toString()
    }]);
    
    socket.emit('send_file', fileData);
    return true;
  }, []);

  // React to message
  const reactToMessage = useCallback((messageId, reaction) => {
    if (socket.connected) {
      socket.emit('react_to_message', { messageId, reaction });
    }
  }, []);

  // Mark message as read
  const markMessageRead = useCallback((messageId) => {
    if (socket.connected) {
      socket.emit('mark_message_read', messageId);
    }
  }, []);

  // Set typing status
  const setTyping = useCallback((isTyping) => {
    if (socket.connected) {
      socket.emit('typing', isTyping);
    }
  }, []);

  // Socket event listeners
  useEffect(() => {
    console.log('🔌 Setting up socket listeners...');

    const onConnect = () => {
      console.log('✅✅✅ CONNECTED TO SERVER!');
      setIsConnected(true);
      setConnectionError(null);
    };

    const onDisconnect = (reason) => {
      console.log('❌ Disconnected:', reason);
      setIsConnected(false);
      setJoinSuccess(false);
    };

    const onConnectError = (error) => {
      console.error('🔴 Connection error:', error);
      setConnectionError(error.message);
    };

    const onJoinSuccess = (data) => {
      console.log('🎉 Join success:', data);
      setJoinSuccess(true);
      setConnectionError(null);
    };

    const onReceiveMessage = (message) => {
      setLastMessage(message);
      setMessages(prev => [...prev, message]);
    };

    const onRoomMessages = (data) => {
      console.log('📨 Received room messages:', data.messages?.length);
      setMessages(data.messages || []);
    };

    const onUserList = (userList) => {
      console.log('👥 User list updated:', userList);
      setUsers(userList);
    };

    const onUserJoined = (data) => {
      console.log('👋 User joined:', data.username);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        system: true,
        message: `${data.username} joined the room`,
        timestamp: new Date().toISOString(),
      }]);
    };

    const onUserLeft = (data) => {
      console.log('👋 User left:', data.username);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        system: true,
        message: `${data.username} left the room`,
        timestamp: new Date().toISOString(),
      }]);
    };

    const onTypingUsers = (users) => {
      setTypingUsers(users);
    };

    const onMessageReaction = (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, reactions: { ...msg.reactions, [data.reaction]: (msg.reactions?.[data.reaction] || 0) + 1 } }
          : msg
      ));
    };

    const onError = (error) => {
      console.error('🔴 Socket error:', error);
      setConnectionError(error.message);
    };

    // Register all event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('join_success', onJoinSuccess);
    socket.on('receive_message', onReceiveMessage);
    socket.on('room_messages', onRoomMessages);
    socket.on('user_list', onUserList);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('typing_users', onTypingUsers);
    socket.on('message_reaction', onMessageReaction);
    socket.on('error', onError);

    // Cleanup
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('join_success', onJoinSuccess);
      socket.off('receive_message', onReceiveMessage);
      socket.off('room_messages', onRoomMessages);
      socket.off('user_list', onUserList);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('typing_users', onTypingUsers);
      socket.off('message_reaction', onMessageReaction);
      socket.off('error', onError);
    };
  }, []);

  return {
    socket,
    isConnected,
    lastMessage,
    messages,
    users,
    typingUsers,
    currentRoom,
    connectionError,
    joinSuccess,
    connect,
    disconnect,
    sendMessage,
    sendFile,
    reactToMessage,
    markMessageRead,
    setTyping,
  };
};

export default socket;