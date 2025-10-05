import { Server } from 'socket.io';

export const configureSocket = (server) => {
  return new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
};