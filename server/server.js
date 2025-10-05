// server/server.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store users and rooms
const users = new Map();
const rooms = new Map();

// Initialize default rooms
['general', 'random', 'tech', 'support'].forEach(room => {
  rooms.set(room, {
    messages: [],
    users: new Set()
  });
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  // Handle user joining
  socket.on('user_join', (userData) => {
    try {
      const { username, room = 'general' } = userData;
      
      if (!username || username.trim() === '') {
        socket.emit('error', { message: 'Username is required' });
        return;
      }

      // Validate room exists
      if (!rooms.has(room)) {
        socket.emit('error', { message: 'Room does not exist' });
        return;
      }

      // Create user object
      const user = {
        id: socket.id,
        username: username.trim(),
        room: room,
        isOnline: true,
        joinedAt: new Date()
      };

      // Store user
      users.set(socket.id, user);
      
      // Join room
      socket.join(room);
      rooms.get(room).users.add(socket.id);

      console.log(`✅ ${user.username} joined room: ${room}`);

      // Send success confirmation to user
      socket.emit('join_success', {
        user: user,
        room: room,
        message: `Successfully joined ${room}`
      });

      // Send room messages to the new user
      const roomMessages = rooms.get(room).messages.slice(-50);
      socket.emit('room_messages', {
        room: room,
        messages: roomMessages
      });

      // Notify room about new user
      socket.to(room).emit('user_joined', {
        username: user.username,
        timestamp: new Date(),
        onlineUsers: Array.from(users.values()).filter(u => u.room === room).length
      });

      // Send updated user list to room
      const roomUsers = Array.from(users.values())
        .filter(u => u.room === room && u.isOnline)
        .map(u => ({ id: u.id, username: u.username }));
      
      io.to(room).emit('user_list', roomUsers);

    } catch (error) {
      console.error('Error in user_join:', error);
      socket.emit('error', { message: 'Server error during login' });
    }
  });

  // Handle chat messages
  socket.on('send_message', (messageData) => {
    const user = users.get(socket.id);
    if (!user) {
      socket.emit('error', { message: 'User not authenticated' });
      return;
    }

    const message = {
      id: Date.now().toString(),
      text: messageData.text,
      sender: user.username,
      senderId: socket.id,
      room: user.room,
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    // Store message in room
    const roomData = rooms.get(user.room);
    if (roomData) {
      roomData.messages.push(message);
      // Keep only last 100 messages
      if (roomData.messages.length > 100) {
        roomData.messages = roomData.messages.slice(-50);
      }
    }

    // Broadcast to room
    io.to(user.room).emit('receive_message', message);
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
      fileData: fileData
    };

    // Store message in room
    const roomData = rooms.get(user.room);
    if (roomData) {
      roomData.messages.push(message);
      if (roomData.messages.length > 100) {
        roomData.messages = roomData.messages.slice(-50);
      }
    }

    // Broadcast to room
    io.to(user.room).emit('receive_message', message);
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
        io.to(user.room).emit('message_updated', message);
      }
    }
  });

  // Handle read receipts
  socket.on('mark_message_read', (messageId) => {
    const user = users.get(socket.id);
    if (!user) return;

    // Find message and mark as read
    for (let [roomName, roomData] of rooms) {
      const message = roomData.messages.find(msg => msg.id === messageId);
      if (message) {
        if (!message.readBy) {
          message.readBy = [];
        }
        if (!message.readBy.includes(socket.id)) {
          message.readBy.push(socket.id);
          // Notify sender that message was read
          socket.to(message.senderId).emit('message_read', {
            messageId,
            readBy: user.username,
            readAt: new Date().toISOString()
          });
        }
        break;
      }
    }
  });

  // Handle typing indicators
  socket.on('typing', (isTyping) => {
    const user = users.get(socket.id);
    if (!user) return;

    socket.to(user.room).emit('user_typing', {
      username: user.username,
      isTyping: isTyping
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      user.isOnline = false;
      
      // Remove from room
      const roomData = rooms.get(user.room);
      if (roomData) {
        roomData.users.delete(socket.id);
      }

      // Notify room
      socket.to(user.room).emit('user_left', {
        username: user.username,
        timestamp: new Date()
      });

      // Update user list
      const roomUsers = Array.from(users.values())
        .filter(u => u.room === user.room && u.isOnline)
        .map(u => ({ id: u.id, username: u.username }));
      
      io.to(user.room).emit('user_list', roomUsers);

      console.log(`❌ ${user.username} disconnected`);
      
      // Remove user after delay
      setTimeout(() => {
        if (users.get(socket.id) && !users.get(socket.id).isOnline) {
          users.delete(socket.id);
        }
      }, 5000);
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// API routes
app.get('/api/rooms', (req, res) => {
  const roomsList = Array.from(rooms.keys()).map(roomName => ({
    name: roomName,
    userCount: rooms.get(roomName).users.size,
    messageCount: rooms.get(roomName).messages.length
  }));
  res.json(roomsList);
});

app.get('/api/messages/:room', (req, res) => {
  const { room } = req.params;
  const roomData = rooms.get(room);
  if (!roomData) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(roomData.messages.slice(-50));
});

app.get('/api/users/:room', (req, res) => {
  const { room } = req.params;
  const roomUsers = Array.from(users.values())
    .filter(user => user.room === room && user.isOnline)
    .map(user => ({
      id: user.id,
      username: user.username,
      isOnline: user.isOnline
    }));
  res.json(roomUsers);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    users: users.size,
    rooms: Array.from(rooms.keys()),
    connections: io.engine.clientsCount
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Socket.io Chat Server is running! 🚀',
    version: '1.0.0',
    endpoints: [
      '/api/rooms - Get available rooms',
      '/api/messages/:room - Get room messages',
      '/api/users/:room - Get room users',
      '/health - Server health check'
    ]
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
  console.log(`🏠 Available rooms: ${Array.from(rooms.keys()).join(', ')}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});