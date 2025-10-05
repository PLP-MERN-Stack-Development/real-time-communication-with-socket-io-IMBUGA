// socket.js - Enhanced Socket.io client setup to match server
import { io } from 'socket.io-client';

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

  // Connect to socket server with room support
  const connect = (userData) => {
    socket.connect();
    if (userData) {
      socket.emit('user_join', userData);
      setCurrentRoom(userData.room || 'general');
    }
  };

  // Disconnect from socket server
  const disconnect = () => {
    socket.disconnect();
  };

  // Send a message with room support
  const sendMessage = (messageData) => {
    const tempId = Date.now().toString();
    const messageWithTempId = {
      ...messageData,
      tempId,
      timestamp: new Date().toISOString()
    };
    
    socket.emit('send_message', messageData);
    
    // Optimistically add message
    setMessages(prev => [...prev, {
      ...messageWithTempId,
      sender: messageData.sender || 'You',
      senderId: socket.id,
      tempId
    }]);
    
    return tempId;
  };

  // Send a private message with enhanced data
  const sendPrivateMessage = (toUserId, message) => {
    const tempId = Date.now().toString();
    socket.emit('private_message', { 
      toUserId, 
      message,
      tempId 
    });
    return tempId;
  };

  // Change room
  const changeRoom = (newRoom) => {
    socket.emit('change_room', newRoom);
    setCurrentRoom(newRoom);
    setMessages([]); // Clear messages for new room
  };

  // Set typing status with room awareness
  const setTyping = (isTyping) => {
    socket.emit('typing', isTyping);
  };

  // Send file
  const sendFile = (fileData) => {
    socket.emit('send_file', fileData);
  };

  // React to message
  const reactToMessage = (messageId, reaction) => {
    socket.emit('react_to_message', { messageId, reaction });
  };

  // Mark message as read
  const markMessageRead = (messageId) => {
    socket.emit('mark_message_read', messageId);
  };

  // Reconnect user
  const reconnectUser = (userData) => {
    socket.emit('reconnect_user', userData);
  };

  // Socket event listeners
  useEffect(() => {
    // Connection events
    const onConnect = () => {
      setIsConnected(true);
      console.log('Connected to server:', socket.id);
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
      if (data.room === currentRoom) {
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
      // Update message read status
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
          id: Date.now(),
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
          id: Date.now(),
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

    // Room events
    const onUserJoinedRoom = (data) => {
      // Handle user joining specific room
    };

    const onUserLeftRoom = (data) => {
      // Handle user leaving specific room
    };

    // Message reactions
    const onMessageUpdated = (message) => {
      setMessageReactions(prev => {
        const newMap = new Map(prev);
        newMap.set(message.id, message.reactions || []);
        return newMap;
      });
    };

    // Error handling
    const onError = (error) => {
      console.error('Socket error:', error);
      alert(`Error: ${error.message}`);
    };

    // Register event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('receive_message', onReceiveMessage);
    socket.on('room_messages', onRoomMessages);
    socket.on('message_delivered', onMessageDelivered);
    socket.on('private_message', onPrivateMessage);
    socket.on('private_message_delivered', onPrivateMessageDelivered);
    socket.on('message_read', onMessageRead);
    socket.on('user_list', onUserList);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('user_reconnected', onUserReconnected);
    socket.on('typing_users', onTypingUsers);
    socket.on('message_updated', onMessageUpdated);
    socket.on('error', onError);

    // Clean up event listeners
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('receive_message', onReceiveMessage);
      socket.off('room_messages', onRoomMessages);
      socket.off('message_delivered', onMessageDelivered);
      socket.off('private_message', onPrivateMessage);
      socket.off('private_message_delivered', onPrivateMessageDelivered);
      socket.off('message_read', onMessageRead);
      socket.off('user_list', onUserList);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('user_reconnected', onUserReconnected);
      socket.off('typing_users', onTypingUsers);
      socket.off('message_updated', onMessageUpdated);
      socket.off('error', onError);
    };
  }, [currentRoom]);

  return {
    socket,
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