export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  
  // Message events
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  ROOM_MESSAGES: 'room_messages',
  MESSAGE_DELIVERED: 'message_delivered',
  
  // User events
  USER_JOIN: 'user_join',
  USER_LIST: 'user_list',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  USER_RECONNECTED: 'user_reconnected',
  
  // Typing events
  TYPING: 'typing',
  TYPING_USERS: 'typing_users',
  
  // Room events
  CHANGE_ROOM: 'change_room',
  
  // Private messages
  PRIVATE_MESSAGE: 'private_message',
  PRIVATE_MESSAGE_DELIVERED: 'private_message_delivered',
  MESSAGE_READ: 'message_read',
  MARK_MESSAGE_READ: 'mark_message_read',
  
  // Reactions
  REACT_TO_MESSAGE: 'react_to_message',
  MESSAGE_UPDATED: 'message_updated',
  
  // Files
  SEND_FILE: 'send_file',
  
  // Errors
  ERROR: 'error'
};

export const DEFAULT_ROOMS = ['general', 'random', 'tech', 'support'];