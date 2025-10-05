// Generate unique room ID
export const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 15);
};

// Validate username
export const isValidUsername = (username) => {
  return username && username.length >= 2 && username.length <= 20;
};

// Validate room name
export const isValidRoom = (room) => {
  const validRooms = ['general', 'random', 'tech', 'support'];
  return validRooms.includes(room);
};

// Format message for storage
export const formatMessage = (messageData, user, room) => {
  return {
    id: Date.now().toString(),
    ...messageData,
    sender: user.username,
    senderId: user.id,
    room: room,
    timestamp: new Date().toISOString(),
    readBy: [user.id]
  };
};