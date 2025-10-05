// socket.js - Enhanced Socket.io client setup to match server
import { io } from 'socket.io-client';
import { useEffect, useState, useCallback, useRef } from 'react';

// Socket.io connection URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Create socket instance with enhanced configuration
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});

// Custom hook for using socket.io with enhanced features
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [availableRooms, setAvailableRooms] = useState(['general', 'random', 'tech', 'support']);
  const [privateMessages, setPrivateMessages] = useState(new Map());
  const [messageReactions, setMessageReactions] = useState(new Map());
  
  // Use refs for values that don't need re-renders
  const socketRef = useRef(socket);
  const currentRoomRef = useRef(currentRoom);

  // Update ref when currentRoom changes
  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  // Connect to socket server with room support
  const connect = useCallback((userData) => {
    socketRef.current.connect();
    if (userData) {
      socketRef.current.emit('user_join', userData);
      setCurrentRoom(userData.room || 'general');
    }
  }, []);

  // Disconnect from socket server
  const disconnect = useCallback(() => {
    socketRef.current.disconnect();
  }, []);

  // Send a message with room support
  const sendMessage = useCallback((messageData) => {
    const tempId = Date.now().toString();
    
    // Optimistically add message
    setMessages(prev => [...prev, {
      ...messageData,
      tempId,
      sender: 'You', // Temporary until server confirms
      senderId: socketRef.current.id,
      timestamp: new Date().toISOString()
    }]);
    
    socketRef.current.emit('send_message', messageData);
    return tempId;
  }, []);

  // Send a private message with enhanced data
  const sendPrivateMessage = useCallback((toUserId, message) => {
    const tempId = Date.now().toString();
    socketRef.current.emit('private_message', { 
      toUserId, 
      message,
      tempId 
    });
    return tempId;
  }, []);

  // Change room
  const changeRoom = useCallback((newRoom) => {
    socketRef.current.emit('change_room', newRoom);
    setCurrentRoom(newRoom);
    setMessages([]); // Clear messages for new room
  }, []);

  // Set typing status with room awareness
  const setTyping = useCallback((isTyping) => {
    socketRef.current.emit('typing', isTyping);
  }, []);

  // Send file
  const sendFile = useCallback((fileData) => {
    socketRef.current.emit('send_file', fileData);
  }, []);

  // React to message
  const reactToMessage = useCallback((messageId, reaction) => {
    socketRef.current.emit('react_to_message', { messageId, reaction });
  }, []);

  // Mark message as read
  const markMessageRead = useCallback((messageId) => {
    socketRef.current.emit('mark_message_read', messageId);
  }, []);

  // Reconnect user
  const reconnectUser = useCallback((userData) => {
    socketRef.current.emit('reconnect_user', userData);
  }, []);

  // Socket event listeners
  useEffect(() => {
    const socketInstance = socketRef.current;

    // Connection events
    const onConnect = () => {
      setIsConnected(true);
      console.log('Connected to server:', socketInstance.id);
    };

    const onDisconnect = (reason) => {
      setIsConnected(false);
      console.log('Disconnected:', reason);
    };

    const onConnectError = (error) => {
      console.error('Connection error:', error);
    };

    // Message events
    const onReceiveMessage = (message) => {
      setLastMessage(message);
      setMessages(prev => [...prev, message]);
    };

    const onRoomMessages = (data) => {
      // Use ref to avoid dependency on currentRoom
      if (data.room === currentRoomRef.current) {
        setMessages(data.messages || []);
      }
    };

    const onMessageDelivered = ({ tempId, messageId }) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId ? { ...msg, id: messageId, tempId: undefined } : msg
        )
      );
    };

    // Private message events
    const onPrivateMessage = (message) => {
      setLastMessage(message);
      // Also add to main messages for display
      setMessages(prev => [...prev, message]);
      
      // Store in private messages map
      const conversationKey = [message.fromId, message.toId].sort().join('_');
      setPrivateMessages(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(conversationKey) || [];
        newMap.set(conversationKey, [...existing, message]);
        return newMap;
      });
    };

    const onPrivateMessageDelivered = ({ tempId, messageId }) => {
      // Handle private message delivery confirmation
      setPrivateMessages(prev => {
        const newMap = new Map(prev);
        for (let [key, messages] of newMap) {
          const updatedMessages = messages.map(msg => 
            msg.tempId === tempId ? { ...msg, id: messageId, tempId: undefined } : msg
          );
          newMap.set(key, updatedMessages);
        }
        return newMap;
      });
    };

    const onMessageRead = ({ messageId, readAt }) => {
      // Update message read status in private messages
      setPrivateMessages(prev => {
        const newMap = new Map(prev);
        for (let [key, messages] of newMap) {
          const updatedMessages = messages.map(msg => 
            msg.id === messageId ? { ...msg, read: true, readAt } : msg
          );
          newMap.set(key, updatedMessages);
        }
        return newMap;
      });
    };

    // User events
    const onUserList = (userList) => {
      setUsers(userList);
    };

    const onUserJoined = (data) => {
      console.log(`${data.username} joined the room`);
      // Add system message
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          system: true,
          message: `${data.username} joined the room`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const onUserLeft = (data) => {
      console.log(`${data.username} left the room`);
      // Add system message
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          system: true,
          message: `${data.username} left the room`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const onUserReconnected = (data) => {
      console.log(`${data.username} reconnected`);
    };

    // Typing events
    const onTypingUsers = (users) => {
      setTypingUsers(users);
    };

    // Message reactions
    const onMessageUpdated = (message) => {
      setMessageReactions(prev => {
        const newMap = new Map(prev);
        newMap.set(message.id, message.reactions || []);
        return newMap;
      });
      
      // Also update the message in the main messages array
      setMessages(prev => 
        prev.map(msg => 
          msg.id === message.id ? { ...msg, reactions: message.reactions } : msg
        )
      );
    };

    // Error handling
    const onError = (error) => {
      console.error('Socket error:', error);
      alert(`Error: ${error.message}`);
    };

    // Register event listeners
    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);
    socketInstance.on('connect_error', onConnectError);
    socketInstance.on('receive_message', onReceiveMessage);
    socketInstance.on('room_messages', onRoomMessages);
    socketInstance.on('message_delivered', onMessageDelivered);
    socketInstance.on('private_message', onPrivateMessage);
    socketInstance.on('private_message_delivered', onPrivateMessageDelivered);
    socketInstance.on('message_read', onMessageRead);
    socketInstance.on('user_list', onUserList);
    socketInstance.on('user_joined', onUserJoined);
    socketInstance.on('user_left', onUserLeft);
    socketInstance.on('user_reconnected', onUserReconnected);
    socketInstance.on('typing_users', onTypingUsers);
    socketInstance.on('message_updated', onMessageUpdated);
    socketInstance.on('error', onError);

    // Clean up event listeners
    return () => {
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
      socketInstance.off('connect_error', onConnectError);
      socketInstance.off('receive_message', onReceiveMessage);
      socketInstance.off('room_messages', onRoomMessages);
      socketInstance.off('message_delivered', onMessageDelivered);
      socketInstance.off('private_message', onPrivateMessage);
      socketInstance.off('private_message_delivered', onPrivateMessageDelivered);
      socketInstance.off('message_read', onMessageRead);
      socketInstance.off('user_list', onUserList);
      socketInstance.off('user_joined', onUserJoined);
      socketInstance.off('user_left', onUserLeft);
      socketInstance.off('user_reconnected', onUserReconnected);
      socketInstance.off('typing_users', onTypingUsers);
      socketInstance.off('message_updated', onMessageUpdated);
      socketInstance.off('error', onError);
    };
  }, []); // Empty dependency array since we use refs

  return {
    socket: socketRef.current,
    isConnected,
    lastMessage,
    messages,
    users,
    typingUsers,
    currentRoom,
    availableRooms,
    privateMessages,
    messageReactions,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    changeRoom,
    setTyping,
    sendFile,
    reactToMessage,
    markMessageRead,
    reconnectUser,
  };
};

export default socket;