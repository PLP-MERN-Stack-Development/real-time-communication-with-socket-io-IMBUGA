// server.js - ES Module version
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Enhanced data storage
const users = new Map();
const rooms = new Map();
const typingUsers = new Map();
const privateMessages = new Map();

// Initialize default rooms
const defaultRooms = ['general', 'random', 'tech', 'support'];
defaultRooms.forEach(room => {
  rooms.set(room, {
    messages: [],
    users: new Set(),
    createdAt: new Date()
  });
});

// Utility functions
const getRoomMessages = (room, limit = 50) => {
  const roomData = rooms.get(room);
  return roomData ? roomData.messages.slice(-limit) : [];
};

const getOnlineUsersInRoom = (room) => {
  const roomData = rooms.get(room);
  if (!roomData) return [];
  
  return Array.from(users.values())
    .filter(user => user.room === room && user.isOnline)
    .map(user => ({
      id: user.id,
      username: user.username,
      isOnline: user.isOnline,
      joinedAt: user.joinedAt
    }));
};

const broadcastToRoom = (room, event, data) => {
  io.to(room).emit(event, data);
};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining with room support
  socket.on('user_join', (userData) => {
    const { username, room = 'general' } = userData;
    
    // Validate room exists
    if (!rooms.has(room)) {
      socket.emit('error', { message: 'Room does not exist' });
      return;
    }

    // Store user information
    const user = {
      id: socket.id,
      username,
      room,
      isOnline: true,
      joinedAt: new Date(),
      lastSeen: new Date()
    };
    
    users.set(socket.id, user);
    
    // Join room
    socket.join(room);
    rooms.get(room).users.add(socket.id);

    // Notify room about new user
    broadcastToRoom(room, 'user_joined', {
      username,
      timestamp: new Date(),
      onlineUsers: getOnlineUsersInRoom(room).length
    });

    // Send room history to the new user
    socket.emit('room_messages', {
      room,
      messages: getRoomMessages(room)
    });

    // Send updated user list to room
    broadcastToRoom(room, 'user_list', getOnlineUsersInRoom(room));

    console.log(`${username} joined room: ${room}`);
  });

  // Handle chat messages with room support
  socket.on('send_message', (messageData) => {
    const user = users.get(socket.id);
    if (!user) {
      socket.emit('error', { message: 'User not authenticated' });
      return;
    }

    const message = {
      ...messageData,
      id: Date.now().toString(),
      sender: user.username,
      senderId: socket.id,
      room: user.room,
      timestamp: new Date().toISOString(),
      type: messageData.type || 'text',
      readBy: [socket.id]
    };

    // Store message in room
    const roomData = rooms.get(user.room);
    if (roomData) {
      roomData.messages.push(message);
      
      // Limit stored messages per room
      if (roomData.messages.length > 200) {
        roomData.messages = roomData.messages.slice(-150);
      }
    }

    // Broadcast to room with delivery confirmation
    socket.emit('message_delivered', { tempId: messageData.tempId, messageId: message.id });
    broadcastToRoom(user.room, 'receive_message', message);
  });

  // Enhanced typing indicator with room support
  socket.on('typing', (isTyping) => {
    const user = users.get(socket.id);
    if (!user) return;

    if (isTyping) {
      typingUsers.set(socket.id, user.username);
    } else {
      typingUsers.delete(socket.id);
    }

    // Broadcast typing users in the same room
    const roomTypingUsers = Array.from(typingUsers.entries())
      .filter(([id, username]) => users.get(id)?.room === user.room)
      .map(([id, username]) => username);

    broadcastToRoom(user.room, 'typing_users', roomTypingUsers);
  });

  // Enhanced private messaging with read receipts
  socket.on('private_message', ({ toUserId, message, tempId }) => {
    const fromUser = users.get(socket.id);
    const toUser = users.get(toUserId);

    if (!fromUser || !toUser) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    const privateMessage = {
      id: Date.now().toString(),
      from: fromUser.username,
      fromId: socket.id,
      to: toUser.username,
      toId: toUserId,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
      read: false
    };

    // Store private message
    const conversationKey = [socket.id, toUserId].sort().join('_');
    if (!privateMessages.has(conversationKey)) {
      privateMessages.set(conversationKey, []);
    }
    privateMessages.get(conversationKey).push(privateMessage);

    // Send to both users with delivery confirmation
    socket.emit('private_message_delivered', { tempId, messageId: privateMessage.id });
    socket.emit('private_message', privateMessage);
    socket.to(toUserId).emit('private_message', privateMessage);
  });

  // Mark private message as read
  socket.on('mark_message_read', (messageId) => {
    // Find and update message read status
    for (let [key, messages] of privateMessages) {
      const message = messages.find(msg => msg.id === messageId);
      if (message && message.toId === socket.id) {
        message.read = true;
        message.readAt = new Date().toISOString();
        
        // Notify sender that message was read
        socket.to(message.fromId).emit('message_read', {
          messageId,
          readAt: message.readAt
        });
        break;
      }
    }
  });

  // Handle room changes
  socket.on('change_room', (newRoom) => {
    const user = users.get(socket.id);
    if (!user || !rooms.has(newRoom)) return;

    const oldRoom = user.room;
    
    if (oldRoom !== newRoom) {
      // Leave old room
      socket.leave(oldRoom);
      rooms.get(oldRoom)?.users.delete(socket.id);

      // Update user room
      user.room = newRoom;
      users.set(socket.id, user);

      // Join new room
      socket.join(newRoom);
      rooms.get(newRoom).users.add(socket.id);

      // Notify rooms
      broadcastToRoom(oldRoom, 'user_left', {
        username: user.username,
        timestamp: new Date()
      });

      broadcastToRoom(newRoom, 'user_joined', {
        username: user.username,
        timestamp: new Date()
      });

      // Send new room messages to user
      socket.emit('room_messages', {
        room: newRoom,
        messages: getRoomMessages(newRoom)
      });

      // Update user lists
      broadcastToRoom(oldRoom, 'user_list', getOnlineUsersInRoom(oldRoom));
      broadcastToRoom(newRoom, 'user_list', getOnlineUsersInRoom(newRoom));

      console.log(`${user.username} moved from ${oldRoom} to ${newRoom}`);
    }
  });

  // Handle file sharing
  socket.on('send_file', (fileData) => {
    const user = users.get(socket.id);
    if (!user) return;

    const message = {
      id: Date.now().toString(),
      sender: user.username,
      senderId: socket.id,
      room: user.room,
      timestamp: new Date().toISOString(),
      type: 'file',
      fileData: {
        name: fileData.name,
        type: fileData.type,
        size: fileData.size,
        url: fileData.url
      }
    };

    const roomData = rooms.get(user.room);
    if (roomData) {
      roomData.messages.push(message);
    }

    broadcastToRoom(user.room, 'receive_message', message);
  });

  // Handle message reactions
  socket.on('react_to_message', ({ messageId, reaction }) => {
    const user = users.get(socket.id);
    if (!user) return;

    // Find message in room messages
    const roomData = rooms.get(user.room);
    if (roomData) {
      const message = roomData.messages.find(msg => msg.id === messageId);
      if (message) {
        if (!message.reactions) {
          message.reactions = [];
        }
        
        // Remove existing reaction from same user
        message.reactions = message.reactions.filter(r => r.userId !== socket.id);
        
        // Add new reaction
        message.reactions.push({
          userId: socket.id,
          username: user.username,
          reaction,
          timestamp: new Date().toISOString()
        });

        // Broadcast updated message
        broadcastToRoom(user.room, 'message_updated', message);
      }
    }
  });

  // Handle disconnection with proper cleanup
  socket.on('disconnect', (reason) => {
    const user = users.get(socket.id);
    
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();
      users.set(socket.id, user);

      // Remove from typing users
      typingUsers.delete(socket.id);

      // Notify room
      const roomData = rooms.get(user.room);
      if (roomData) {
        roomData.users.delete(socket.id);
        broadcastToRoom(user.room, 'user_left', {
          username: user.username,
          timestamp: new Date(),
          reason: reason
        });

        // Update typing users
        const roomTypingUsers = Array.from(typingUsers.entries())
          .filter(([id, username]) => users.get(id)?.room === user.room)
          .map(([id, username]) => username);
        
        broadcastToRoom(user.room, 'typing_users', roomTypingUsers);
        
        // Update user list
        broadcastToRoom(user.room, 'user_list', getOnlineUsersInRoom(user.room));
      }

      console.log(`${user.username} disconnected: ${reason}`);
      
      // Remove user after delay (for reconnection)
      setTimeout(() => {
        if (!users.get(socket.id)?.isOnline) {
          users.delete(socket.id);
        }
      }, 30000);
    }
  });

  // Handle reconnection
  socket.on('reconnect_user', (userData) => {
    const user = users.get(socket.id);
    if (user) {
      user.isOnline = true;
      users.set(socket.id, user);
      
      broadcastToRoom(user.room, 'user_reconnected', {
        username: user.username,
        timestamp: new Date()
      });
      
      broadcastToRoom(user.room, 'user_list', getOnlineUsersInRoom(user.room));
    }
  });
});

// Enhanced API routes
app.get('/api/messages/:room', (req, res) => {
  const { room } = req.params;
  const { limit = 50, before } = req.query;
  
  if (!rooms.has(room)) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  let messages = getRoomMessages(room, parseInt(limit));
  
  if (before) {
    messages = messages.filter(msg => msg.id < before);
  }
  
  res.json({
    room,
    messages,
    hasMore: messages.length === parseInt(limit)
  });
});

app.get('/api/rooms', (req, res) => {
  const roomsList = Array.from(rooms.keys()).map(roomName => ({
    name: roomName,
    userCount: rooms.get(roomName).users.size,
    messageCount: rooms.get(roomName).messages.length
  }));
  
  res.json(roomsList);
});

app.get('/api/users/:room', (req, res) => {
  const { room } = req.params;
  res.json(getOnlineUsersInRoom(room));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    users: users.size,
    rooms: rooms.size,
    connections: io.engine.clientsCount
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Socket.io Chat Server is running',
    version: '1.0.0',
    endpoints: [
      '/api/rooms - Get available rooms',
      '/api/messages/:room - Get room messages',
      '/api/users/:room - Get room users',
      '/health - Server health check'
    ]
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io server initialized`);
  console.log(`🏠 Default rooms: ${defaultRooms.join(', ')}`);
});

export { app, server, io, users, rooms };